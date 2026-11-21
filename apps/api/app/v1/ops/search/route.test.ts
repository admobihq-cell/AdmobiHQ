import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import type { OpsPermission, SearchResponseDto } from "@workspace/ops-contracts"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()
const tag = `ops-search-test-${Date.now()}`
let caller: { userId: string; role: string; permissions: OpsPermission[] } = {
  userId: `${tag}-admin`,
  role: "admin",
  permissions: [],
}

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireOpsAccess: vi.fn(async () => ({ access: caller })),
}))

import { GET } from "./route"

async function search(q: string): Promise<SearchResponseDto> {
  const res = await GET(new Request(`http://test/v1/ops/search?q=${encodeURIComponent(q)}`))
  expect(res.status).toBe(200)
  return (await res.json()) as SearchResponseDto
}

describe.skipIf(!databaseUrl)("GET /v1/ops/search", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  let caseId = 0
  let echoCaseId = 0
  let campaignId = 0
  let docId = 0
  let docNumber = ""
  const leadIds: number[] = []
  const crowdIds: number[] = []

  beforeAll(async () => {
    const target = await prisma.supportCase.create({
      data: { contact_name: tag, contact_email: `${tag}@x.test`, channel: "web", subject: `${tag} target`, access_token_hash: `${tag}-a` },
    })
    caseId = target.id
    // Another case whose subject contains the first case's id: the exact id hit must still come first.
    const echo = await prisma.supportCase.create({
      data: { contact_name: tag, contact_email: `${tag}@x.test`, channel: "web", subject: `ref ${caseId} follow-up`, access_token_hash: `${tag}-b` },
    })
    echoCaseId = echo.id
    // More newer text matches than one group holds: the exact id must not fall out of the window.
    for (let i = 0; i < 7; i++) {
      const crowd = await prisma.supportCase.create({
        data: { contact_name: tag, contact_email: `${tag}@x.test`, channel: "web", subject: `crowd ${caseId} #${i}`, access_token_hash: `${tag}-c${i}` },
      })
      crowdIds.push(crowd.id)
    }
    const campaign = await prisma.campaign.create({ data: { clerk_user_id: tag, name: `${tag} campaign` } })
    campaignId = campaign.id
    // A year far from real data so the canonical number can't collide.
    const seq = String(Date.now() % 10000).padStart(4, "0")
    docNumber = `INV/2099/${seq}`
    const doc = await prisma.billingDocument.create({
      data: {
        kind: "invoice",
        number: docNumber,
        customer: { name: tag },
        lines: [],
        issue_date: new Date(),
        due_date: new Date(),
        subtotal_kes: 0,
        discount_kes: 0,
        tax_kes: 0,
        total_kes: 0,
        created_by: tag,
      },
    })
    docId = doc.id
    for (const company_name of [`${tag} 50% off`, `${tag} 500 off`]) {
      const lead = await prisma.lead.create({ data: { email: `${tag}@x.test`, company_name, audience: "campaign" } })
      leadIds.push(lead.id)
    }
  }, 30_000)

  afterAll(async () => {
    await prisma.supportCase.deleteMany({ where: { id: { in: [caseId, echoCaseId, ...crowdIds] } } })
    await prisma.campaign.deleteMany({ where: { id: campaignId } })
    await prisma.billingDocument.deleteMany({ where: { id: docId } })
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } })
    await prisma.$disconnect()
  })

  it("finds a support case by #id first, then by subject", async () => {
    caller = { userId: `${tag}-admin`, role: "admin", permissions: [] }
    const body = await search(`#${caseId}`)
    const support = body.groups.find((g) => g.key === "support")!
    expect(support.hits[0]!.href).toBe(`/support/${caseId}`)
    const ids = support.hits.map((h) => h.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("keeps the exact id first even when newer text matches fill the group", async () => {
    caller = { userId: `${tag}-admin`, role: "admin", permissions: [] }
    const support = (await search(String(caseId))).groups.find((g) => g.key === "support")!
    expect(support.hits[0]!.id).toBe(`support:${caseId}`)
    expect(support.hits.length).toBeLessThanOrEqual(5)
  })

  it("shows payouts only to finances, like the payouts screen", async () => {
    caller = { userId: `${tag}-payouts`, role: "payouts-only", permissions: ["payouts"] }
    const body = await search("1")
    expect(body.groups.find((g) => g.key === "payouts")).toBeUndefined()
  })

  it("hides groups the role cannot see", async () => {
    caller = { userId: `${tag}-support`, role: "support", permissions: ["support"] }
    const body = await search(String(campaignId))
    expect(body.groups.find((g) => g.key === "campaigns")).toBeUndefined()
    expect(body.groups.find((g) => g.key === "documents")).toBeUndefined()
  })

  it("canonicalises document numbers", async () => {
    caller = { userId: `${tag}-admin`, role: "admin", permissions: [] }
    const [, year, seq] = docNumber.split("/")
    const body = await search(`inv-${year}-${Number(seq)}`)
    const docs = body.groups.find((g) => g.key === "documents")!
    expect(docs.hits[0]!.href).toBe(`/finances/documents/${docId}`)
  })

  it("treats % literally", async () => {
    caller = { userId: `${tag}-admin`, role: "admin", permissions: [] }
    const body = await search(`${tag} 50%`)
    const leads = body.groups.find((g) => g.key === "leads")!
    expect(leads.hits.map((h) => h.title)).toEqual([`${tag} 50% off`])
  })

  it("returns no groups for a blank query", async () => {
    caller = { userId: `${tag}-admin`, role: "admin", permissions: [] }
    expect((await search(" ")).groups).toEqual([])
  })
})
