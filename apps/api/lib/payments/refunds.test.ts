import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

let opsAllowed = true
vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async () =>
      opsAllowed ? { access: { userId: "ops_1", email: "ops@admobihq.com" } } : { error: actual.jsonError("Forbidden", 403) },
    ),
  }
})
vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn() }))
const createRefund = vi.fn()
vi.mock("@/lib/payments/paystack", async () => ({
  ...(await vi.importActual<typeof import("@/lib/payments/paystack")>("@/lib/payments/paystack")),
  createRefund: (...a: unknown[]) => createRefund(...a),
}))
const notifyRefundUpdate = vi.fn()
vi.mock("@/lib/payments/money-notify", () => ({ notifyRefundUpdate: (...a: unknown[]) => notifyRefundUpdate(...a) }))

import { POST as opsRefund } from "@/app/v1/ops/payments/refunds/route"
import { PaystackError } from "./paystack"
import { allocateRefund, handleRefundEvent, refundCredit } from "./refunds"

const databaseUrl = testDatabaseUrl()

describe("allocateRefund", () => {
  const p1 = { id: 1, reference: "p1", amountKes: 20000, refundedKes: 0, paidAt: new Date("2026-10-01") }
  const p2 = { id: 2, reference: "p2", amountKes: 15000, refundedKes: 5000, paidAt: new Date("2026-11-01") }

  it("takes from the newest payment first, never past what it has left", () => {
    expect(allocateRefund(30000, [p1, p2])).toEqual([
      { paymentId: 2, reference: "p2", amountKes: 10000 },
      { paymentId: 1, reference: "p1", amountKes: 20000 },
    ])
  })

  it("throws when the payments can't cover the amount", () => {
    expect(() => allocateRefund(30000.01, [p1, p2])).toThrow(RangeError)
  })
})

describe.skipIf(!databaseUrl)("refundCredit", { timeout: 60_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `refund-test-${Date.now()}`
  let orgId = 0
  let seq = 0

  const balance = () =>
    prisma.walletTransaction.aggregate({ where: { org_id: orgId }, _sum: { amount_kes: true } }).then((r) => Number(r._sum.amount_kes ?? 0))

  /** A settled Paystack payment of `amount`, with its top_up ledger row. */
  async function paid(amount: number, daysAgo: number) {
    seq += 1
    const reference = `adm-pay-rf${String(Date.now()).slice(-6)}${String(seq).padStart(4, "0")}`
    const ledger = await prisma.walletTransaction.create({
      data: { org_id: orgId, kind: "top_up", amount_kes: amount, provider: "paystack", reference, description: tag, occurred_at: new Date() },
    })
    return prisma.payment.create({
      data: {
        org_id: orgId, reference, amount_kes: amount, status: "success", channel: "mobile_money",
        paid_at: new Date(Date.now() - daysAgo * 86_400_000), created_by: "user_payer", wallet_transaction_id: ledger.id,
      },
    })
  }

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: tag } })).id
  }, 30_000)

  beforeEach(async () => {
    opsAllowed = true
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    createRefund.mockImplementation(async () => ({ id: 7000 + Math.floor(Math.random() * 1e6), status: "pending" }))
    await prisma.refund.deleteMany({ where: { org_id: orgId } })
    await prisma.payment.deleteMany({ where: { org_id: orgId } })
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
  })

  afterAll(async () => {
    await prisma.refund.deleteMany({ where: { org_id: orgId } })
    await prisma.payment.deleteMany({ where: { org_id: orgId } })
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("refuses more than available and writes nothing", async () => {
    await paid(5000, 1)
    await expect(refundCredit({ orgId, amountKes: 5000.01, reason: "test", opsEmail: "o@x" })).rejects.toThrow(RangeError)
    expect(await prisma.refund.count({ where: { org_id: orgId } })).toBe(0)
    expect(createRefund).not.toHaveBeenCalled()
  })

  it("debits the balance immediately, splits across payments and notifies once", async () => {
    await paid(20000, 10)
    await paid(15000, 1)
    const { refundIds } = await refundCredit({ orgId, amountKes: 30000, reason: "unused", opsEmail: "o@x" })
    expect(refundIds).toHaveLength(2)
    expect(await balance()).toBe(5000)
    const rows = await prisma.walletTransaction.findMany({ where: { org_id: orgId, kind: "cash_refund" } })
    expect(rows.map((r) => Number(r.amount_kes)).sort()).toEqual([-15000, -15000])
    expect(createRefund).toHaveBeenCalledTimes(2)
    expect(notifyRefundUpdate).toHaveBeenCalledTimes(1)
    expect(notifyRefundUpdate).toHaveBeenCalledWith(expect.objectContaining({ stage: "sent", amountKes: 30000, method: "mpesa" }))
    const refunds = await prisma.refund.findMany({ where: { org_id: orgId } })
    expect(refunds.every((r) => r.status === "processing" && /^adm-refund-\d+$/.test(r.reference))).toBe(true)
  })

  it("refund.failed restores the balance once, however often it arrives", async () => {
    await paid(10000, 1)
    const { refundIds } = await refundCredit({ orgId, amountKes: 4000, reason: "unused", opsEmail: "o@x" })
    const refund = await prisma.refund.findUniqueOrThrow({ where: { id: refundIds[0]! } })
    expect(await balance()).toBe(6000)

    const event = { id: Number(refund.provider_refund_id), status: "failed" }
    await handleRefundEvent("refund.failed", event)
    await handleRefundEvent("refund.failed", event)
    expect(await balance()).toBe(10000)
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: refund.id } })).status).toBe("failed")
    expect(notifyRefundUpdate.mock.calls.filter((c) => c[0].stage === "delayed")).toHaveLength(1)
  })

  it("refund.processed closes the row and notifies once", async () => {
    await paid(10000, 1)
    const { refundIds } = await refundCredit({ orgId, amountKes: 1000, reason: "unused", opsEmail: "o@x" })
    const refund = await prisma.refund.findUniqueOrThrow({ where: { id: refundIds[0]! } })
    await handleRefundEvent("refund.processed", { id: Number(refund.provider_refund_id) })
    await handleRefundEvent("refund.processed", { id: Number(refund.provider_refund_id) })
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: refund.id } })).status).toBe("processed")
    expect(notifyRefundUpdate.mock.calls.filter((c) => c[0].stage === "processed")).toHaveLength(1)
    expect(await balance()).toBe(9000)
  })

  it("a definite Paystack rejection reverses; a network error needs attention and keeps the debit", async () => {
    await paid(10000, 1)
    createRefund.mockRejectedValueOnce(new PaystackError("Transaction has been fully reversed", 400, {}))
    await refundCredit({ orgId, amountKes: 1000, reason: "a", opsEmail: "o@x" })
    expect(await balance()).toBe(10000)

    createRefund.mockRejectedValueOnce(new TypeError("fetch failed"))
    const { refundIds } = await refundCredit({ orgId, amountKes: 1000, reason: "b", opsEmail: "o@x" })
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: refundIds[0]! } })).status).toBe("needs_attention")
    expect(await balance()).toBe(9000)
    expect(notifyRefundUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ stage: "sent" }))
  })

  it("the ops route needs finances", async () => {
    opsAllowed = false
    const res = await opsRefund(new Request("http://localhost", { method: "POST", body: JSON.stringify({ orgId, amountKes: 10, reason: "nope" }) }))
    expect(res.status).toBe(403)
  })

  it("the ops route answers 409 when the amount exceeds available", async () => {
    const res = await opsRefund(new Request("http://localhost", { method: "POST", body: JSON.stringify({ orgId, amountKes: 10, reason: "none left" }) }))
    expect(res.status).toBe(409)
  })
})
