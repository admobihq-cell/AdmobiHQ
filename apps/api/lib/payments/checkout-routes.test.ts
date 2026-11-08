import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()
let orgId = 0
let denied: string[] = []

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerPermissionAccess: vi.fn(async (permission: string) =>
      denied.includes(permission)
        ? { error: actual.jsonError("Forbidden", 403) }
        : { access: { userId: "user_checkout", orgId } },
    ),
  }
})
vi.mock("@/lib/campaigns/campaign-store", async () => ({
  ...(await vi.importActual<typeof import("@/lib/campaigns/campaign-store")>("@/lib/campaigns/campaign-store")),
  missingCampaignFields: (c: { name: string }) => (c.name.endsWith("incomplete") ? ["market"] : []),
  missingCampaignCreatives: () => [],
}))
vi.mock("@/lib/customer/customer-clerk", () => ({ getCustomerEmail: vi.fn(async () => "payer@x.co") }))
const initializeTransaction = vi.fn()
const verifyTransaction = vi.fn()
vi.mock("@/lib/payments/paystack", async () => ({
  ...(await vi.importActual<typeof import("@/lib/payments/paystack")>("@/lib/payments/paystack")),
  initializeTransaction: (...a: unknown[]) => initializeTransaction(...a),
  verifyTransaction: (...a: unknown[]) => verifyTransaction(...a),
}))
vi.mock("@/lib/payments/money-notify", () => ({
  notifyPaymentReceived: vi.fn(async () => undefined),
  notifyPaymentNotApplied: vi.fn(async () => undefined),
  notifyPaymentFailed: vi.fn(async () => undefined),
  notifyPaymentMismatch: vi.fn(async () => undefined),
}))

import { POST as checkout } from "@/app/v1/customer/campaigns/[id]/checkout/route"
import { GET as status } from "@/app/v1/customer/payments/[reference]/route"
import { POST as topUp } from "@/app/v1/customer/payments/top-up/route"

const postCheckout = (id: number) =>
  checkout(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: String(id) }) })
const postTopUp = (body: unknown) =>
  topUp(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }))
const getStatus = (reference: string) =>
  status(new Request("http://localhost"), { params: Promise.resolve({ reference }) })

describe.skipIf(!databaseUrl)("checkout, top-up and status routes", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `checkout-test-${Date.now()}`
  let otherOrgId = 0

  const campaign = (over: object = {}) =>
    prisma.campaign.create({
      data: { clerk_user_id: tag, org_id: orgId, name: `${tag} c`, budget_kes: 50000, status: "draft", ...over },
    })
  const balance = (amount: number) =>
    prisma.walletTransaction.create({
      data: { org_id: orgId, kind: "top_up", amount_kes: amount, provider: "manual", description: tag, occurred_at: new Date() },
    })

  beforeAll(async () => {
    process.env.PAYSTACK_CALLBACK_URL = "https://app.test/billing/payment-return"
    orgId = (await prisma.advertiserOrg.create({ data: { name: tag } })).id
    otherOrgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} other` } })).id
  }, 30_000)

  beforeEach(async () => {
    denied = []
    vi.clearAllMocks()
    initializeTransaction.mockResolvedValue({ authorizationUrl: "https://checkout.paystack.com/abc", accessCode: "abc" })
    await prisma.payment.deleteMany({ where: { org_id: { in: [orgId, otherOrgId] } } })
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
  })

  afterAll(async () => {
    await prisma.invoice.deleteMany({ where: { org_id: orgId } })
    await prisma.payment.deleteMany({ where: { org_id: { in: [orgId, otherOrgId] } } })
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } })
    await prisma.$disconnect()
  })

  it("checkout charges only what the balance doesn't cover", async () => {
    await balance(12000.5)
    const c = await campaign()
    const res = await postCheckout(c.id)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ authorizationUrl: "https://checkout.paystack.com/abc", amountKes: 37999.5 })
    expect(body.reference).toMatch(/^adm-pay-[0-9a-f]{12}$/)
    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amountKes: 37999.5,
        email: "payer@x.co",
        reference: body.reference,
        callbackUrl: "https://app.test/billing/payment-return",
        channels: ["mobile_money", "card"],
        metadata: { payment_reference: body.reference, org_id: orgId, campaign_id: c.id },
      }),
    )
  })

  it("reuses an initiated payment within 30 minutes", async () => {
    const c = await campaign()
    const first = await (await postCheckout(c.id)).json()
    const second = await (await postCheckout(c.id)).json()
    expect(second.reference).toBe(first.reference)
    expect(initializeTransaction).toHaveBeenCalledTimes(1)
  })

  it("checkout 404s for another org's campaign", async () => {
    const c = await campaign({ org_id: otherOrgId })
    expect((await postCheckout(c.id)).status).toBe(404)
  })

  it("checkout 409s when not editable or already funded", async () => {
    expect((await postCheckout((await campaign({ status: "submitted" })).id)).status).toBe(409)
    expect((await postCheckout((await campaign({ funded_at: new Date() })).id)).status).toBe(409)
  })

  it("checkout 400s for an incomplete campaign", async () => {
    const res = await postCheckout((await campaign({ name: `${tag} incomplete` })).id)
    expect(res.status).toBe(400)
    expect((await res.json()).issues.missingFields).toEqual(["market"])
  })

  it("checkout 409s with dueKes 0 when the balance covers it", async () => {
    await balance(60000)
    const res = await postCheckout((await campaign()).id)
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ dueKes: 0 })
    expect(initializeTransaction).not.toHaveBeenCalled()
  })

  it("checkout needs campaigns:submit", async () => {
    denied = ["campaigns:submit"]
    expect((await postCheckout((await campaign()).id)).status).toBe(403)
  })

  it("checkout marks the payment failed when Paystack refuses to initialize", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    initializeTransaction.mockRejectedValue(new Error("boom"))
    const res = await postCheckout((await campaign()).id)
    expect(res.status).toBe(502)
    expect((await prisma.payment.findFirstOrThrow({ where: { org_id: orgId } })).status).toBe("failed")
  })

  it("top-up validates the amount and needs billing:write", async () => {
    expect((await postTopUp({ amountKes: 99 })).status).toBe(400)
    expect((await postTopUp({ amountKes: 1_000_001 })).status).toBe(400)
    expect((await postTopUp({ amountKes: 150.5 })).status).toBe(400)
    const ok = await postTopUp({ amountKes: 5000 })
    expect(ok.status).toBe(200)
    expect((await ok.json()).amountKes).toBe(5000)
    denied = ["billing:write"]
    expect((await postTopUp({ amountKes: 5000 })).status).toBe(403)
  })

  it("status 404s for another org's reference", async () => {
    await prisma.payment.create({
      data: { org_id: otherOrgId, reference: "adm-pay-aaaaaaaaaaaa", amount_kes: 100, created_by: "x" },
    })
    expect((await getStatus("adm-pay-aaaaaaaaaaaa")).status).toBe(404)
  })

  it("status reports pending, then settles itself once the webhook is 20 s late", async () => {
    const payment = await prisma.payment.create({
      data: { org_id: orgId, reference: "adm-pay-bbbbbbbbbbbb", amount_kes: 5000, created_by: "user_checkout" },
    })
    const fresh = await (await getStatus(payment.reference)).json()
    expect(fresh.status).toBe("pending")
    expect(verifyTransaction).not.toHaveBeenCalled()

    await prisma.payment.update({ where: { id: payment.id }, data: { created_at: new Date(Date.now() - 21_000) } })
    verifyTransaction.mockResolvedValue({
      id: 1, status: "success", reference: payment.reference, amount: 500000, currency: "KES",
      channel: "card", fees: 14500, paid_at: new Date().toISOString(), gateway_response: "Approved",
    })
    const settled = await (await getStatus(payment.reference)).json()
    expect(settled).toMatchObject({ status: "success", amountKes: 5000, campaignId: null })
    expect(settled.invoiceId).toEqual(expect.any(Number))
  })

  it("status works with campaigns:submit alone", async () => {
    denied = ["billing:read"]
    await prisma.payment.create({
      data: { org_id: orgId, reference: "adm-pay-cccccccccccc", amount_kes: 100, created_by: "x" },
    })
    expect((await getStatus("adm-pay-cccccccccccc")).status).toBe(200)
  })
})
