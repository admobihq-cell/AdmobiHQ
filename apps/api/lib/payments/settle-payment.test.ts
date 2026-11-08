import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

const verifyTransaction = vi.fn()
vi.mock("@/lib/payments/paystack", async () => ({
  ...(await vi.importActual<typeof import("@/lib/payments/paystack")>("@/lib/payments/paystack")),
  verifyTransaction: (...a: unknown[]) => verifyTransaction(...a),
}))
vi.mock("@/lib/payments/money-notify", () => ({
  notifyPaymentReceived: vi.fn(async () => undefined),
  notifyPaymentNotApplied: vi.fn(async () => undefined),
  notifyPaymentFailed: vi.fn(async () => undefined),
  notifyPaymentMismatch: vi.fn(async () => undefined),
}))
vi.mock("@/lib/campaigns/submit-campaign", async () => ({
  ...(await vi.importActual<typeof import("@/lib/campaigns/submit-campaign")>("@/lib/campaigns/submit-campaign")),
  announceCampaignSubmitted: vi.fn(async () => undefined),
}))

import { announceCampaignSubmitted } from "@/lib/campaigns/submit-campaign"
import * as notify from "@/lib/payments/money-notify"
import { invoiceNumber, settlePayment } from "./settle-payment"

const databaseUrl = testDatabaseUrl()

it("invoiceNumber pads the payment id", () => {
  expect(invoiceNumber(42, new Date("2026-11-08"))).toBe("INV-2026-000042")
})

describe.skipIf(!databaseUrl)("settlePayment", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `settle-test-${Date.now()}`
  let orgId = 0
  let seq = 0

  const paystackOk = (reference: string, cents: number, extra: object = {}) => ({
    id: 900000 + seq,
    status: "success",
    reference,
    amount: cents,
    currency: "KES",
    channel: "mobile_money",
    fees: 57000,
    paid_at: new Date().toISOString(),
    gateway_response: "Approved",
    authorization: { last4: "1234" },
    customer: { email: "x@y.z", phone: "0710000000" },
    ...extra,
  })

  /** A draft campaign (budget 50,000) plus a 12,000.50 balance → 37,999.50 due. */
  async function scenario() {
    seq += 1
    const campaign = await prisma.campaign.create({
      data: {
        clerk_user_id: tag,
        org_id: orgId,
        name: `${tag} c${seq}`,
        budget_kes: 50000,
        status: "draft",
        starts_on: new Date(Date.now() + 5 * 86_400_000),
        ends_on: new Date(Date.now() + 15 * 86_400_000),
      },
    })
    const reference = `adm-pay-${tag.slice(-6)}${String(seq).padStart(6, "0")}`
    const payment = await prisma.payment.create({
      data: { org_id: orgId, campaign_id: campaign.id, reference, amount_kes: 37999.5, created_by: "user_payer" },
    })
    return { campaign, payment, reference }
  }

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: tag } })).id
  }, 30_000)

  beforeEach(async () => {
    vi.clearAllMocks()
    // Fresh balance each test: wipe this org's ledger and campaigns.
    await prisma.invoice.deleteMany({ where: { org_id: orgId } })
    await prisma.payment.deleteMany({ where: { org_id: orgId } })
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.walletTransaction.create({
      data: {
        org_id: orgId,
        kind: "top_up",
        amount_kes: 12000.5,
        provider: "manual",
        description: `${tag} opening`,
        occurred_at: new Date(),
      },
    })
  }, 30_000)

  afterAll(async () => {
    await prisma.invoice.deleteMany({ where: { org_id: orgId } })
    await prisma.payment.deleteMany({ where: { org_id: orgId } })
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("settles a successful payment once", async () => {
    const { campaign, reference } = await scenario()
    verifyTransaction.mockResolvedValue(paystackOk(reference, 3799950))

    expect(await settlePayment(reference)).toBe("settled")

    const ledger = await prisma.walletTransaction.findMany({ where: { org_id: orgId, reference } })
    expect(ledger).toHaveLength(1)
    expect(ledger[0]!.kind).toBe("top_up")
    expect(Number(ledger[0]!.amount_kes)).toBe(37999.5)
    expect(ledger[0]!.provider).toBe("paystack")

    const invoice = await prisma.invoice.findFirstOrThrow({ where: { org_id: orgId } })
    expect(invoice.status).toBe("paid")
    expect(Number(invoice.tax_kes)).toBe(0)
    expect(Number(invoice.total_kes)).toBe(37999.5)

    const after = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })
    expect(after.funded_at).not.toBeNull()
    expect(after.status).toBe("submitted")

    const payment = await prisma.payment.findUniqueOrThrow({ where: { reference } })
    expect(payment.status).toBe("success")
    expect(Number(payment.provider_fee_kes)).toBe(570)
    expect(payment.wallet_transaction_id).toBe(ledger[0]!.id)
    expect(JSON.stringify(payment.raw_event)).not.toContain("last4")
    expect(JSON.stringify(payment.raw_event)).not.toContain("0710000000")

    expect(announceCampaignSubmitted).toHaveBeenCalledTimes(1)
  })

  it("is idempotent under concurrency", async () => {
    const { reference } = await scenario()
    verifyTransaction.mockResolvedValue(paystackOk(reference, 3799950))

    const results = await Promise.all([settlePayment(reference), settlePayment(reference)])
    expect(results.sort()).toEqual(["already_settled", "settled"])
    expect(await prisma.walletTransaction.count({ where: { reference } })).toBe(1)
    expect(notify.notifyPaymentReceived).toHaveBeenCalledTimes(1)
  })

  it("rejects an amount mismatch", async () => {
    const { campaign, reference } = await scenario()
    verifyTransaction.mockResolvedValue(paystackOk(reference, 3799850))

    expect(await settlePayment(reference)).toBe("amount_mismatch")
    expect(await settlePayment(reference)).toBe("amount_mismatch")
    expect((await prisma.payment.findUniqueOrThrow({ where: { reference } })).status).toBe("amount_mismatch")
    expect(await prisma.walletTransaction.count({ where: { reference } })).toBe(0)
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe("draft")
    expect(notify.notifyPaymentMismatch).toHaveBeenCalledTimes(1)
  })

  it("rejects a non-KES currency", async () => {
    const { reference } = await scenario()
    verifyTransaction.mockResolvedValue(paystackOk(reference, 3799950, { currency: "NGN" }))
    expect(await settlePayment(reference)).toBe("amount_mismatch")
  })

  it("keeps credit when the balance moved", async () => {
    const { campaign, reference } = await scenario()
    // Another campaign is funded from the same 12,000.50 before this payment lands.
    await prisma.campaign.create({
      data: {
        clerk_user_id: tag,
        org_id: orgId,
        name: `${tag} rival`,
        budget_kes: 10000,
        status: "submitted",
        funded_at: new Date(),
        ends_on: new Date(Date.now() + 15 * 86_400_000),
      },
    })
    verifyTransaction.mockResolvedValue(paystackOk(reference, 3799950))

    expect(await settlePayment(reference)).toBe("settled")
    expect(await prisma.walletTransaction.count({ where: { reference } })).toBe(1)
    const after = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })
    expect(after.status).toBe("draft")
    expect(after.funded_at).toBeNull()
    expect(notify.notifyPaymentNotApplied).toHaveBeenCalledTimes(1)
    expect(announceCampaignSubmitted).not.toHaveBeenCalled()
  })

  it("marks failed and writes nothing else", async () => {
    const { reference } = await scenario()
    verifyTransaction.mockResolvedValue({ ...paystackOk(reference, 3799950), status: "failed", gateway_response: "Declined" })

    expect(await settlePayment(reference)).toBe("failed")
    const payment = await prisma.payment.findUniqueOrThrow({ where: { reference } })
    expect(payment.status).toBe("failed")
    expect(payment.failure_reason).toBe("Declined")
    expect(await prisma.walletTransaction.count({ where: { reference } })).toBe(0)
    expect(await prisma.invoice.count({ where: { org_id: orgId } })).toBe(0)
    expect(notify.notifyPaymentFailed).toHaveBeenCalledTimes(1)
  })

  it("treats a young abandoned checkout as still pending", async () => {
    const { reference } = await scenario()
    verifyTransaction.mockResolvedValue({ ...paystackOk(reference, 3799950), status: "abandoned" })
    expect(await settlePayment(reference)).toBe("pending")
    expect((await prisma.payment.findUniqueOrThrow({ where: { reference } })).status).toBe("initiated")
  })

  it("marks an old abandoned checkout abandoned", async () => {
    const { reference } = await scenario()
    await prisma.payment.update({ where: { reference }, data: { created_at: new Date(Date.now() - 31 * 60_000) } })
    verifyTransaction.mockResolvedValue({ ...paystackOk(reference, 3799950), status: "abandoned" })
    expect(await settlePayment(reference)).toBe("abandoned")
    expect((await prisma.payment.findUniqueOrThrow({ where: { reference } })).status).toBe("abandoned")
  })

  it("returns unknown_reference when there is no row", async () => {
    expect(await settlePayment("adm-pay-doesnotexist")).toBe("unknown_reference")
    expect(verifyTransaction).not.toHaveBeenCalled()
  })

  it("notifies once across repeated settles", async () => {
    const { reference } = await scenario()
    verifyTransaction.mockResolvedValue(paystackOk(reference, 3799950))
    await settlePayment(reference)
    await settlePayment(reference)
    expect(notify.notifyPaymentReceived).toHaveBeenCalledTimes(1)
  })
})
