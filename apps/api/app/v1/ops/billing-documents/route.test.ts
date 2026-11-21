import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { auditFromOpsUser } from "@/lib/audit"
import { testDatabaseUrl } from "@/lib/test-database-url"
import { GET as getOne, PATCH } from "./[id]/route"
import { GET as getOptions } from "./options/route"
import { GET as list, POST } from "./route"

const databaseUrl = testDatabaseUrl()
const tag = `billing-ops-${Date.now()}`
let allowed = true

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async (permission: string) =>
      allowed
        ? { access: { userId: `billing-ops-user`, email: "ops@admobihq.com" } }
        : { error: new Response(JSON.stringify({ error: `Forbidden — "${permission}" access required` }), { status: 403 }) }
    ),
  }
})
vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(async () => undefined) }))

const url = "http://localhost/v1/ops/billing-documents"
const json = (body: unknown) => JSON.stringify(body)
const params = (id: number) => ({ params: Promise.resolve({ id: String(id) }) })

describe.skipIf(!databaseUrl)("ops billing document routes", { timeout: 60_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  let orgId = 0
  let campaignId = 0
  let foreignCampaignId = 0

  const body = (overrides: Record<string, unknown> = {}) => ({
    kind: "invoice",
    orgId,
    campaignId: null,
    customer: { name: `${tag} customer` },
    issueDate: "2026-11-21",
    dueDate: "2026-12-05",
    lines: [{ description: "Screen time", quantity: 2, unitPriceKes: 500 }],
    reference: tag,
    ...overrides,
  })

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} A`, tax_pin: "P051234567Z" } })).id
    const otherOrgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} B` } })).id
    campaignId = (await prisma.campaign.create({ data: { clerk_user_id: tag, org_id: orgId, name: `${tag} mine` } })).id
    foreignCampaignId = (
      await prisma.campaign.create({ data: { clerk_user_id: tag, org_id: otherOrgId, name: `${tag} theirs` } })
    ).id
  })

  beforeEach(() => {
    allowed = true
    vi.mocked(auditFromOpsUser).mockClear()
  })

  afterAll(async () => {
    await prisma.billingDocument.deleteMany({ where: { reference: tag } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { name: { startsWith: tag } } })
    await prisma.$disconnect()
  })

  it("requires the finances permission", async () => {
    allowed = false
    expect((await list(new Request(url))).status).toBe(403)
    expect((await POST(new Request(url, { method: "POST", body: json(body()) }))).status).toBe(403)
  })

  it("creates a draft with a number and audits it", async () => {
    const res = await POST(new Request(url, { method: "POST", body: json(body({ campaignId })) }))
    expect(res.status).toBe(201)
    const doc = await res.json()
    expect(doc).toMatchObject({ status: "draft", totalKes: 1000, campaignName: `${tag} mine` })
    expect(doc.number).toMatch(/^INV\/2026\/\d{4,}$/)
    expect(auditFromOpsUser).toHaveBeenCalledTimes(1)
    expect(vi.mocked(auditFromOpsUser).mock.calls[0]![1]).toMatchObject({
      entity_type: "billing_document",
      entity_id: doc.id,
      org_id: orgId,
    })

    const listed = await (await list(new Request(`${url}?orgId=${orgId}`))).json()
    expect(listed.items.map((i: { id: number }) => i.id)).toContain(doc.id)
  })

  it("rejects a campaign from another organization", async () => {
    const res = await POST(new Request(url, { method: "POST", body: json(body({ campaignId: foreignCampaignId })) }))
    expect(res.status).toBe(400)
  })

  it("rejects an invalid body", async () => {
    const res = await POST(new Request(url, { method: "POST", body: json(body({ lines: [] })) }))
    expect(res.status).toBe(400)
  })

  it("edits a draft and refuses to edit a sent document", async () => {
    const created = await (await POST(new Request(url, { method: "POST", body: json(body()) }))).json()
    const patched = await PATCH(
      new Request(`${url}/${created.id}`, { method: "PATCH", body: json(body({ feeKes: 50 })) }),
      params(created.id)
    )
    expect(patched.status).toBe(200)
    expect((await patched.json()).totalKes).toBe(1050)

    await prisma.billingDocument.update({ where: { id: created.id }, data: { status: "sent" } })
    const locked = await PATCH(new Request(`${url}/${created.id}`, { method: "PATCH", body: json(body()) }), params(created.id))
    expect(locked.status).toBe(409)
  })

  it("answers 404 for an unknown id", async () => {
    expect((await getOne(new Request(`${url}/999999999`), params(999_999_999))).status).toBe(404)
  })

  it("lists orgs with their campaigns and the company defaults", async () => {
    const options = await (await getOptions()).json()
    const org = options.orgs.find((o: { id: number }) => o.id === orgId)
    expect(org).toMatchObject({ name: `${tag} A`, taxPin: "P051234567Z" })
    expect(org.campaigns).toEqual([{ id: campaignId, name: `${tag} mine` }])
    expect(options.defaults.quoteTerms).toMatch(/valid until/)
  })
})
