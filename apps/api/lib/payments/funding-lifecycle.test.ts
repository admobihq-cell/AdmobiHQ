import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()
let orgId = 0

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireCustomerPermissionAccess: vi.fn(async () => ({ access: { userId: "user_life", orgId } })),
  requireOpsPermissionAccess: vi.fn(async () => ({ access: { userId: "ops_1", email: "ops@admobihq.com" } })),
}))
vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(), auditFromCustomerUser: vi.fn() }))
vi.mock("@/lib/advertiser/advertiser-notify", async () => ({
  ...(await vi.importActual<typeof import("@/lib/advertiser/advertiser-notify")>("@/lib/advertiser/advertiser-notify")),
  fanOutCustomerCampaignNotice: vi.fn(),
}))
vi.mock("@/lib/customer/customer-clerk", () => ({ getCustomerEmail: vi.fn(async () => null), getCustomerName: vi.fn(async () => null) }))
const notifyCreditReleased = vi.fn()
vi.mock("@/lib/payments/money-notify", () => ({ notifyCreditReleased: (...a: unknown[]) => notifyCreditReleased(...a) }))

import { PATCH as review } from "@/app/v1/campaigns/[id]/review/route"
import { PATCH } from "@/app/v1/customer/campaigns/[id]/route"

const patch = (id: number, body: object) =>
  PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: String(id) }),
  })
const decide = (id: number, decision: string) =>
  review(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ decision, reason: "Because" }) }), {
    params: Promise.resolve({ id: String(id) }),
  })

describe.skipIf(!databaseUrl)("funding lifecycle", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `lifecycle-test-${Date.now()}`
  const campaign = (over: object) =>
    prisma.campaign.create({
      data: { clerk_user_id: tag, org_id: orgId, name: `${tag} c`, budget_kes: 50000, ...over },
    })
  const fundedAt = (id: number) => prisma.campaign.findUniqueOrThrow({ where: { id } }).then((c) => c.funded_at)

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: tag } })).id
  }, 30_000)
  beforeEach(() => vi.clearAllMocks())
  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("locks the budget of a funded campaign but not its dates", async () => {
    const c = await campaign({ status: "changes_requested", funded_at: new Date() })
    const locked = await patch(c.id, { budget_kes: 60000 })
    expect(locked.status).toBe(409)
    expect((await locked.json()).error).toBe("Budget is locked once a campaign is funded")
    expect((await patch(c.id, { budget_kes: 50000 })).status).toBe(200) // unchanged value is fine
    expect((await patch(c.id, { starts_on: "2030-01-01", ends_on: "2030-01-10" })).status).toBe(200)
  })

  it("rejecting releases the hold and notifies the unspent amount", async () => {
    const c = await campaign({ status: "submitted", funded_at: new Date() })
    await prisma.walletTransaction.create({
      data: { org_id: orgId, campaign_id: c.id, kind: "spend", amount_kes: -1500, provider: "manual", description: tag, occurred_at: new Date() },
    })
    expect((await decide(c.id, "rejected")).status).toBe(200)
    expect(await fundedAt(c.id)).toBeNull()
    expect(notifyCreditReleased).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, amountKes: 48500, reason: "rejected", campaign: { id: c.id, name: `${tag} c` } }),
    )
  })

  it("changes_requested keeps the campaign funded", async () => {
    const c = await campaign({ status: "submitted", funded_at: new Date() })
    await decide(c.id, "changes_requested")
    expect(await fundedAt(c.id)).not.toBeNull()
    expect(notifyCreditReleased).not.toHaveBeenCalled()
  })

  it("un-approving to rejected releases the hold", async () => {
    const c = await campaign({ status: "approved", funded_at: new Date() })
    await decide(c.id, "rejected")
    expect(await fundedAt(c.id)).toBeNull()
  })

  it("rejecting an unfunded campaign sends no credit notice", async () => {
    const c = await campaign({ status: "submitted" })
    await decide(c.id, "rejected")
    expect(notifyCreditReleased).not.toHaveBeenCalled()
  })
})
