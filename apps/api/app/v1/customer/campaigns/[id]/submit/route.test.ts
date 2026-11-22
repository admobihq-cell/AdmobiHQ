import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()
let orgId = 0

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireCustomerPermissionAccess: vi.fn(async () => ({ access: { userId: "user_submit", orgId } })),
}))
// Completeness has its own tests; here every campaign counts as complete.
vi.mock("@/lib/campaigns/campaign-store", async () => ({
  ...(await vi.importActual<typeof import("@/lib/campaigns/campaign-store")>("@/lib/campaigns/campaign-store")),
  missingCampaignFields: () => [],
  missingCampaignCreatives: () => [],
}))
vi.mock("@/lib/campaigns/submit-campaign", async () => ({
  ...(await vi.importActual<typeof import("@/lib/campaigns/submit-campaign")>("@/lib/campaigns/submit-campaign")),
  announceCampaignSubmitted: vi.fn(async () => undefined),
}))

import { POST } from "./route"

const submit = (id: number) =>
  POST(new Request(`http://localhost/v1/customer/campaigns/${id}/submit`, { method: "POST" }), {
    params: Promise.resolve({ id: String(id) }),
  })

describe.skipIf(!databaseUrl)("submit campaign funding", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `submit-test-${Date.now()}`

  const campaign = (over: object = {}) =>
    prisma.campaign.create({
      data: {
        clerk_user_id: tag,
        org_id: orgId,
        name: `${tag} c`,
        budget_kes: 50000,
        status: "draft",
        ends_on: new Date(Date.now() + 15 * 86_400_000),
        ...over,
      },
    })

  const topUp = (amount: number) =>
    prisma.walletTransaction.create({
      data: { org_id: orgId, kind: "top_up", amount_kes: amount, provider: "manual", description: `${tag}`, occurred_at: new Date() },
    })

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: tag } })).id
  }, 30_000)

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
  })

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("funds an unfunded campaign from a sufficient balance and submits it", async () => {
    await topUp(60000)
    const c = await campaign()
    const res = await submit(c.id)
    expect(res.status).toBe(200)
    const after = await prisma.campaign.findUniqueOrThrow({ where: { id: c.id } })
    expect(after.status).toBe("submitted")
    expect(after.funded_at).not.toBeNull()
  })

  it("answers 402 with dueKes when the balance is short", async () => {
    await topUp(12000.5)
    const c = await campaign()
    const res = await submit(c.id)
    expect(res.status).toBe(402)
    expect(await res.json()).toMatchObject({ error: "Payment required", dueKes: 37999.5 })
    const after = await prisma.campaign.findUniqueOrThrow({ where: { id: c.id } })
    expect(after.status).toBe("draft")
    expect(after.funded_at).toBeNull()
  })

  it("adds what a below-zero balance owes to dueKes, so paying it funds the campaign", async () => {
    await prisma.walletTransaction.create({
      data: { org_id: orgId, kind: "cash_refund", amount_kes: -97, provider: "manual", description: tag, occurred_at: new Date() },
    })
    const c = await campaign({ budget_kes: 1 })
    const res = await submit(c.id)
    expect(res.status).toBe(402)
    expect(await res.json()).toMatchObject({ dueKes: 98, owedKes: 97 })
  })

  it("resubmits an already-funded campaign without a balance check", async () => {
    const c = await campaign({ status: "changes_requested", funded_at: new Date() })
    const res = await submit(c.id)
    expect(res.status).toBe(200)
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("submitted")
  })
})
