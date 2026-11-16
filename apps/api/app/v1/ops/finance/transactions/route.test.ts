import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { auditFromOpsUser } from "@/lib/audit"
import { testDatabaseUrl } from "@/lib/test-database-url"
import { POST } from "./route"

const databaseUrl = testDatabaseUrl()

let allowed = true

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async (permission: string) =>
      allowed
        ? { access: { userId: "ops_fin_1", email: "ops@admobihq.com" } }
        : { error: new Response(JSON.stringify({ error: `Forbidden — "${permission}" access required` }), { status: 403 }) }
    ),
  }
})

vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(async () => undefined) }))

const post = (body: unknown) =>
  POST(new Request("http://localhost/v1/ops/finance/transactions", { method: "POST", body: JSON.stringify(body) }))

describe.skipIf(!databaseUrl)("ops record transaction", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `ops-fin-${Date.now()}`
  let orgId = 0
  let otherOrgId = 0
  let campaignId = 0
  let foreignCampaignId = 0

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} A` } })).id
    otherOrgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} B` } })).id
    campaignId = (await prisma.campaign.create({ data: { clerk_user_id: tag, org_id: orgId, name: `${tag} mine` } })).id
    foreignCampaignId = (await prisma.campaign.create({ data: { clerk_user_id: tag, org_id: otherOrgId, name: `${tag} theirs` } })).id
  }, 30_000)

  beforeEach(() => {
    allowed = true
    vi.mocked(auditFromOpsUser).mockClear()
  })

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { description: { startsWith: tag } } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } })
    await prisma.$disconnect()
  })

  it("requires the finances permission", async () => {
    allowed = false
    const res = await post({ orgId, kind: "top_up", amountKes: 1000, reason: `${tag} nope` })
    expect(res.status).toBe(403)
    expect(await prisma.walletTransaction.count({ where: { description: `${tag} nope` } })).toBe(0)
  })

  it("writes a manual row with who recorded it, and an audit event", async () => {
    const res = await post({ orgId, kind: "top_up", amountKes: 5000, reference: `${tag}-ref-1`, reason: `${tag} cash top-up` })
    expect(res.status).toBe(201)
    const row = await prisma.walletTransaction.findFirstOrThrow({ where: { reference: `${tag}-ref-1` } })
    expect(row).toMatchObject({ org_id: orgId, kind: "top_up", provider: "manual", created_by: "ops_fin_1", is_demo: false })
    expect(Number(row.amount_kes)).toBe(5000)
    expect(auditFromOpsUser).toHaveBeenCalledTimes(1)
    expect(vi.mocked(auditFromOpsUser).mock.calls[0]![1]).toMatchObject({
      entity_type: "wallet_transaction",
      entity_id: row.id,
      org_id: orgId,
    })
  })

  it("applies the correct sign per kind", async () => {
    const sign = async (kind: string, amountKes: number, extra: object = {}) => {
      const reason = `${tag} sign ${kind} ${amountKes}`
      const res = await post({ orgId, kind, amountKes, reason, ...extra })
      expect(res.status, `${kind} ${amountKes}`).toBe(201)
      return Number((await prisma.walletTransaction.findFirstOrThrow({ where: { description: reason } })).amount_kes)
    }
    expect(await sign("top_up", 100)).toBe(100)
    expect(await sign("spend", 40, { spendCategory: "screen_time", campaignId })).toBe(-40)
    expect(await sign("refund", 10, { spendCategory: "screen_time" })).toBe(10)
    expect(await sign("adjustment", -25)).toBe(-25)
    expect(await sign("adjustment", 25)).toBe(25)
  })

  it("rejects a zero amount", async () => {
    for (const kind of ["top_up", "adjustment"]) {
      expect((await post({ orgId, kind, amountKes: 0, reason: `${tag} zero` })).status, kind).toBe(400)
    }
    expect(await prisma.walletTransaction.count({ where: { description: `${tag} zero` } })).toBe(0)
  })

  it("rejects a negative top-up, spend or refund, and spend without a category", async () => {
    expect((await post({ orgId, kind: "top_up", amountKes: -5, reason: `${tag} neg` })).status).toBe(400)
    expect((await post({ orgId, kind: "spend", amountKes: 5, reason: `${tag} nocat` })).status).toBe(400)
    expect((await post({ orgId, kind: "top_up", amountKes: 5, reason: "x" })).status).toBe(400)
  })

  it("rejects a duplicate reference", async () => {
    const body = { orgId, kind: "top_up", amountKes: 10, reference: `${tag}-dup`, reason: `${tag} first` }
    expect((await post(body)).status).toBe(201)
    const again = await post({ ...body, reason: `${tag} second` })
    expect(again.status).toBe(409)
    expect(await prisma.walletTransaction.count({ where: { reference: `${tag}-dup` } })).toBe(1)
  })

  it("refuses a campaign from another organization and an unknown organization", async () => {
    const wrong = await post({ orgId, kind: "spend", amountKes: 5, spendCategory: "production", campaignId: foreignCampaignId, reason: `${tag} wrong` })
    expect(wrong.status).toBe(400)
    expect(await prisma.walletTransaction.count({ where: { description: `${tag} wrong` } })).toBe(0)
    expect((await post({ orgId: 2_000_000_000, kind: "top_up", amountKes: 5, reason: `${tag} ghost` })).status).toBe(404)
  })
})
