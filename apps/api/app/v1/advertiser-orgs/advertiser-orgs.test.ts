import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const databaseUrl = process.env.DATABASE_URL

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async () => ({
      access: { userId: "ops_1", email: "ops@admobihq.com" },
    })),
  }
})

vi.mock("@/lib/customer-clerk", () => ({
  getCustomerEmail: vi.fn(async (id: string) => `${id}@example.com`),
  getCustomerName: vi.fn(async (id: string) => `User ${id}`),
  customerClerkClient: { users: { getUserList: vi.fn(async () => ({ data: [] })) } },
}))

describe.skipIf(!databaseUrl)("ops advertiser-orgs routes", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stamp = Date.now()
  const ownerId = `ops-org-owner-${stamp}`
  let orgId = 0
  let campaignId = 0

  beforeAll(async () => {
    const org = await prisma.advertiserOrg.create({ data: { name: `Ops Org View ${stamp}` } })
    orgId = org.id
    await prisma.advertiserMember.create({
      data: { org_id: org.id, clerk_user_id: ownerId, is_owner: true },
    })
    const campaign = await prisma.campaign.create({
      data: {
        org_id: org.id,
        clerk_user_id: ownerId,
        name: `Ops Org Campaign ${stamp}`,
        format: "taxi_top",
        status: "submitted",
        contact_email: `${ownerId}@example.com`,
        submitted_at: new Date(),
      },
    })
    campaignId = campaign.id
  }, 30_000)

  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { id: campaignId } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it(
    "lists the org with member and campaign counts",
    async () => {
      const { GET } = await import("./route")
      const res = await GET(
        new Request(`http://localhost/v1/advertiser-orgs?search=${encodeURIComponent(`Ops Org View ${stamp}`)}`),
      )
      expect(res.status).toBe(200)
      const body = await res.json()
      const row = body.items.find((i: { id: number }) => i.id === orgId)
      expect(row).toBeTruthy()
      expect(row.memberCount).toBe(1)
      expect(row.campaignCount).toBe(1)
      expect(row.name).toContain("Ops Org View")
    },
    30_000,
  )

  it(
    "returns detail with members, campaigns, and no raw audit summary fields",
    async () => {
      const { GET } = await import("./[id]/route")
      const res = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ id: String(orgId) }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(orgId)
      expect(body.members).toHaveLength(1)
      expect(body.members[0].isOwner).toBe(true)
      expect(body.campaigns.some((c: { id: number }) => c.id === campaignId)).toBe(true)
      expect(body).not.toHaveProperty("summary")
      expect(JSON.stringify(body.activity)).not.toContain("actor_email")
    },
    30_000,
  )
})
