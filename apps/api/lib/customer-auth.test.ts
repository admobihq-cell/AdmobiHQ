import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/customer-clerk", () => ({
  getCustomerCompanyName: vi.fn(async () => "Acme Media"),
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ authorization: "Bearer test-token" })),
}))
vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(async () => ({ sub: currentTestUserId })),
}))

let currentTestUserId = ""
const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)("customer-auth org bootstrap", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const createdUserIds: string[] = []

  beforeAll(async () => {
    process.env.CUSTOMER_CLERK_SECRET_KEY = "test-secret"
  })

  afterEach(async () => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    // Delete orgs FIRST, while their members still exist to match this
    // relational filter — AdvertiserMember.org has onDelete: Cascade, so
    // this also removes the member rows. Deleting members first would make
    // this filter match zero orgs (their only member is already gone) and
    // silently leak an AdvertiserOrg row on every run.
    await prisma.advertiserOrg.deleteMany({ where: { members: { some: { clerk_user_id: { in: createdUserIds } } } } })
    await prisma.$disconnect()
  })

  it(
    "bootstraps a new user into an org they own, seeded from the Clerk company name",
    async () => {
      currentTestUserId = `auth-test-${Date.now()}`
      createdUserIds.push(currentTestUserId)

      const { getCustomerAccess } = await import("./customer-auth")
      const access = await getCustomerAccess()

      expect(access.status).toBe("authorized")
      if (access.status !== "authorized") throw new Error("unreachable")
      expect(access.isOwner).toBe(true)
      expect(access.userId).toBe(currentTestUserId)

      const org = await prisma.advertiserOrg.findUnique({ where: { id: access.orgId } })
      expect(org?.name).toBe("Acme Media")
    },
    30_000,
  )

  it(
    "is idempotent: two concurrent calls for the same user race onto the same org",
    async () => {
      currentTestUserId = `auth-test-concurrent-${Date.now()}`
      createdUserIds.push(currentTestUserId)

      const { getCustomerAccess } = await import("./customer-auth")
      const [first, second] = await Promise.all([getCustomerAccess(), getCustomerAccess()])

      if (first.status !== "authorized" || second.status !== "authorized") throw new Error("unreachable")
      expect(second.orgId).toBe(first.orgId)

      const memberCount = await prisma.advertiserMember.count({
        where: { clerk_user_id: currentTestUserId },
      })
      expect(memberCount).toBe(1)
    },
    30_000,
  )

  it(
    "an owner holds every permission without a role assignment",
    async () => {
      currentTestUserId = `auth-test-owner-${Date.now()}`
      createdUserIds.push(currentTestUserId)

      const { getCustomerAccess } = await import("./customer-auth")
      const access = await getCustomerAccess()
      if (access.status !== "authorized") throw new Error("unreachable")

      expect(access.permissions.has("campaigns:submit")).toBe(true)
      expect(access.permissions.has("org:manage")).toBe(true)
    },
    30_000,
  )

  it(
    "a Member-role non-owner can write campaigns but not submit them",
    async () => {
      currentTestUserId = `auth-test-member-role-${Date.now()}`
      createdUserIds.push(currentTestUserId)

      const memberRole = await prisma.advertiserRole.findFirst({
        where: { org_id: null, name: "Member" },
      })
      if (!memberRole) throw new Error("seeded 'Member' role not found — run seed:advertiser-roles first")

      const org = await prisma.advertiserOrg.create({ data: { name: "Member Role Test Org" } })
      await prisma.advertiserMember.create({
        data: { org_id: org.id, clerk_user_id: currentTestUserId, is_owner: false, role_id: memberRole.id },
      })

      const { requireCustomerPermission } = await import("./customer-auth")

      const access = await requireCustomerPermission("campaigns:write")
      expect(access.orgId).toBe(org.id)

      let thrown: unknown
      try {
        await requireCustomerPermission("campaigns:submit")
      } catch (error) {
        thrown = error
      }
      expect(thrown).toBeInstanceOf(Response)
      expect((thrown as Response).status).toBe(403)
    },
    30_000,
  )

  it(
    "getAdvertiserOrgId returns null for a user with no membership, without creating one",
    async () => {
      const strangerId = `auth-test-stranger-${Date.now()}`
      const { getAdvertiserOrgId } = await import("./customer-auth")

      const orgId = await getAdvertiserOrgId(strangerId)
      expect(orgId).toBeNull()

      const member = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: strangerId } })
      expect(member).toBeNull()
    },
    30_000,
  )
})
