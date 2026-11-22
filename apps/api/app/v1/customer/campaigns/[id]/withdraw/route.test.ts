import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { nairobiDay } from "@workspace/ops-contracts"

import { availableKes } from "@/lib/payments/funding"
import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()
let orgId = 0

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireCustomerPermissionAccess: vi.fn(async () => ({ access: { userId: "user_withdraw", orgId } })),
}))
vi.mock("@/lib/audit", () => ({ auditFromCustomerUser: vi.fn(async () => undefined) }))
vi.mock("@/lib/payments/money-notify", () => ({ notifyCreditReleased: vi.fn(async () => undefined) }))

import { POST } from "./route"

const withdraw = (id: number) =>
  POST(new Request(`http://localhost/v1/customer/campaigns/${id}/withdraw`, { method: "POST" }), {
    params: Promise.resolve({ id: String(id) }),
  })

const day = (offset: number) => new Date(`${nairobiDay(new Date(Date.now() + offset * 86_400_000))}T00:00:00Z`)

describe.skipIf(!databaseUrl)("withdraw campaign", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `withdraw-test-${Date.now()}`

  const campaign = (over: object) =>
    prisma.campaign.create({
      data: { clerk_user_id: tag, org_id: orgId, name: `${tag} c`, budget_kes: 1000, starts_on: day(3), ends_on: day(10), ...over },
    })

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: tag } })).id
  }, 30_000)

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.walletTransaction.create({
      data: { org_id: orgId, kind: "top_up", amount_kes: 1000, provider: "manual", description: tag, occurred_at: new Date() },
    })
  })

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("cancels a funded campaign in review and frees its budget", async () => {
    const c = await campaign({ status: "submitted", funded_at: new Date() })
    expect(await prisma.$transaction((tx) => availableKes(tx, orgId))).toBe(0)
    const res = await withdraw(c.id)
    expect(res.status).toBe(200)
    const after = await prisma.campaign.findUniqueOrThrow({ where: { id: c.id } })
    expect(after.status).toBe("cancelled")
    expect(after.funded_at).toBeNull()
    expect(await prisma.$transaction((tx) => availableKes(tx, orgId))).toBe(1000)
  })

  it("allows an approved flight that hasn't started", async () => {
    const c = await campaign({ status: "approved", funded_at: new Date() })
    expect((await withdraw(c.id)).status).toBe(200)
  })

  it("refuses an approved flight that has started, a draft, and a rejected campaign", async () => {
    const live = await campaign({ status: "approved", funded_at: new Date(), starts_on: day(0) })
    const draft = await campaign({ status: "draft" })
    const rejected = await campaign({ status: "rejected" })
    for (const c of [live, draft, rejected]) expect((await withdraw(c.id)).status).toBe(409)
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: live.id } })).status).toBe("approved")
  })
})
