import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import type { AdvertiserPermission, SearchResponseDto } from "@workspace/ops-contracts"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()
const tag = `customer-search-test-${Date.now()}`
let caller: { userId: string; orgId: number; isOwner: boolean; permissions: Set<AdvertiserPermission> } = {
  userId: tag,
  orgId: 0,
  isOwner: true,
  permissions: new Set(),
}

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireCustomerAccess: vi.fn(async () => ({ access: caller })),
}))

import { GET } from "./route"

async function search(q: string): Promise<SearchResponseDto> {
  const res = await GET(new Request(`http://test/v1/customer/search?q=${encodeURIComponent(q)}`))
  expect(res.status).toBe(200)
  return (await res.json()) as SearchResponseDto
}

const allHits = (body: SearchResponseDto) => body.groups.flatMap((g) => g.hits)

describe.skipIf(!databaseUrl)("GET /v1/customer/search", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const orgIds: number[] = []
  const campaignIds: number[] = []
  const docIds: number[] = []
  const numbers: Record<string, string> = {}
  const seq = Date.now() % 1000

  async function doc(orgId: number, status: string, n: number) {
    const number = `INV/2098/${String(seq * 10 + n).padStart(4, "0")}`
    const row = await prisma.billingDocument.create({
      data: {
        kind: "invoice",
        number,
        status,
        org_id: orgId,
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
    docIds.push(row.id)
    return number
  }

  beforeAll(async () => {
    for (const name of ["A", "B"]) {
      const org = await prisma.advertiserOrg.create({ data: { name: `${tag} org ${name}` } })
      orgIds.push(org.id)
      const campaign = await prisma.campaign.create({ data: { clerk_user_id: tag, name: `${tag} ${name}`, org_id: org.id } })
      campaignIds.push(campaign.id)
    }
    numbers.aSent = await doc(orgIds[0]!, "sent", 1)
    numbers.aDraft = await doc(orgIds[0]!, "draft", 2)
    numbers.bSent = await doc(orgIds[1]!, "sent", 3)
  }, 30_000)

  afterAll(async () => {
    await prisma.billingDocument.deleteMany({ where: { id: { in: docIds } } })
    await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: orgIds } } })
    await prisma.$disconnect()
  })

  it("never returns another org's rows", async () => {
    caller = { userId: tag, orgId: orgIds[0]!, isOwner: true, permissions: new Set() }
    expect(allHits(await search(String(campaignIds[1])))).not.toContainEqual(expect.objectContaining({ id: `campaigns:${campaignIds[1]}` }))
    expect(allHits(await search(numbers.bSent!))).toEqual([])
    const own = await search(String(campaignIds[0]))
    expect(own.groups.find((g) => g.key === "campaigns")!.hits[0]!.href).toBe(`/campaigns/${campaignIds[0]}`)
  })

  it("drops billing groups without billing:read", async () => {
    caller = { userId: tag, orgId: orgIds[0]!, isOwner: false, permissions: new Set(["campaigns:read"]) }
    const body = await search(numbers.aSent!)
    expect(body.groups.map((g) => g.key)).not.toContain("documents")
    expect(body.groups.map((g) => g.key)).not.toContain("payments")
  })

  it("only shows documents the customer list shows", async () => {
    caller = { userId: tag, orgId: orgIds[0]!, isOwner: true, permissions: new Set() }
    expect((await search(numbers.aSent!)).groups.find((g) => g.key === "documents")!.hits[0]!.title).toBe(numbers.aSent)
    expect((await search(numbers.aDraft!)).groups.find((g) => g.key === "documents")).toBeUndefined()
  })
})
