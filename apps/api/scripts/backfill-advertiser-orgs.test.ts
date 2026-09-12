import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const FAKE_USERS = [
  { id: "backfill-test-user-a", unsafeMetadata: { companyName: "Acme Media" } },
  { id: "backfill-test-user-b", unsafeMetadata: {} },
]

const databaseUrl = process.env.DATABASE_URL
const testPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) })

vi.mock("@/lib/customer-clerk", () => ({
  readCompanyName: (user: { unsafeMetadata?: unknown }) => {
    const metadata = user.unsafeMetadata
    if (typeof metadata !== "object" || metadata === null) return null
    const companyName = (metadata as Record<string, unknown>).companyName
    return typeof companyName === "string" && companyName.trim() ? companyName.trim() : null
  },
  customerClerkClient: {
    users: {
      getUserList: vi.fn(async ({ offset }: { offset: number }) => ({
        data: offset === 0 ? FAKE_USERS : [],
      })),
    },
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: testPrisma,
}))

vi.mock("@/lib/load-env", () => ({}))

describe.skipIf(!databaseUrl)("backfillAdvertiserOrgs", () => {
  const prisma = testPrisma

  beforeAll(async () => {
    await prisma.campaign.create({
      data: { clerk_user_id: "backfill-test-user-a", name: "Pre-existing campaign" },
    })
  })

  afterAll(async () => {
    const memberships = await prisma.advertiserMember.findMany({
      where: { clerk_user_id: { in: FAKE_USERS.map((u) => u.id) } },
    })
    const orgIds = memberships.map((m) => m.org_id)
    await prisma.campaign.deleteMany({ where: { clerk_user_id: "backfill-test-user-a" } })
    await prisma.advertiserMember.deleteMany({ where: { clerk_user_id: { in: FAKE_USERS.map((u) => u.id) } } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: orgIds } } })
    await prisma.$disconnect()
  })

  it(
    "creates an org + owner membership per Clerk user, and stamps their campaigns",
    async () => {
      const { backfillAdvertiserOrgs } = await import("./backfill-advertiser-orgs")
      const result = await backfillAdvertiserOrgs()

      expect(result.orgsCreated).toBe(2)
      expect(result.orphanedCampaignIds).toEqual([])

      const memberA = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: "backfill-test-user-a" } })
      expect(memberA?.is_owner).toBe(true)
      const orgA = await prisma.advertiserOrg.findUnique({ where: { id: memberA!.org_id } })
      expect(orgA?.name).toBe("Acme Media")

      const campaign = await prisma.campaign.findFirst({ where: { clerk_user_id: "backfill-test-user-a" } })
      expect(campaign?.org_id).toBe(memberA!.org_id)

      const memberB = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: "backfill-test-user-b" } })
      const orgB = await prisma.advertiserOrg.findUnique({ where: { id: memberB!.org_id } })
      expect(orgB?.name).toBe("")
    },
    30_000,
  )

  it(
    "is idempotent: running it again creates nothing new",
    async () => {
      const { backfillAdvertiserOrgs } = await import("./backfill-advertiser-orgs")
      const result = await backfillAdvertiserOrgs()
      expect(result.orgsCreated).toBe(0)
    },
    30_000,
  )
})
