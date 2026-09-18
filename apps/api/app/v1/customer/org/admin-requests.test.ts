import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()

let actingUserId = ""
let actingOrgId = 0
let actingIsOwner = true
let actingPermissions = new Set<string>(["team:manage", "org:manage"])

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerAccess: vi.fn(async () => ({
      access: {
        userId: actingUserId,
        orgId: actingOrgId,
        isOwner: actingIsOwner,
        permissions: actingPermissions,
      },
    })),
  }
})

vi.mock("@/lib/customer-clerk", () => ({
  getCustomerEmail: vi.fn(async (id: string) => `${id}@example.com`),
  getCustomerName: vi.fn(async () => "Test User"),
  customerClerkClient: {
    users: { getUserList: vi.fn(async () => ({ data: [] })) },
  },
}))
vi.mock("@/lib/audit", () => ({
  auditFromCustomerUser: vi.fn(async () => undefined),
}))

/**
 * Approving an admin request grants the org's "Admin" role, not the singular
 * owner bypass — an org can have any number of admins, while ownership only
 * changes hands through explicit transfer. See apps/api/lib/advertiser-org.ts
 * getAdminRoleId and the admin-requests [id] route.
 */
describe.skipIf(!databaseUrl)("admin-requests approval grants the Admin role", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stamp = Date.now()
  const ownerId = `admin-req-test-owner-${stamp}`
  const requesterAId = `admin-req-test-a-${stamp}`
  const requesterBId = `admin-req-test-b-${stamp}`
  let orgId = 0
  let memberRoleId = 0
  let adminRoleId = 0

  beforeAll(async () => {
    const memberRole =
      (await prisma.advertiserRole.findFirst({ where: { org_id: null, name: "Member" } })) ??
      (await prisma.advertiserRole.create({
        data: { org_id: null, name: "Member", permissions: ["campaigns:read"] },
      }))
    memberRoleId = memberRole.id

    const adminRole = await prisma.advertiserRole.findFirst({
      where: { org_id: null, name: "Admin" },
    })
    if (!adminRole) throw new Error("Run `pnpm --filter web run seed:advertiser-roles` first")
    adminRoleId = adminRole.id

    const org = await prisma.advertiserOrg.create({ data: { name: "Admin Request Test Co" } })
    orgId = org.id
    await prisma.advertiserMember.create({
      data: { org_id: org.id, clerk_user_id: ownerId, is_owner: true },
    })
    await prisma.advertiserMember.create({
      data: { org_id: org.id, clerk_user_id: requesterAId, role_id: memberRoleId },
    })
    await prisma.advertiserMember.create({
      data: { org_id: org.id, clerk_user_id: requesterBId, role_id: memberRoleId },
    })

    actingOrgId = orgId
  }, 30_000)

  afterAll(async () => {
    await prisma.advertiserAdminRequest.deleteMany({ where: { org_id: orgId } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.advertiserMember.deleteMany({
      where: { clerk_user_id: { in: [ownerId, requesterAId, requesterBId] } },
    })
    await prisma.$disconnect()
  })

  it(
    "approving two different members' requests makes both Admins, not owners",
    async () => {
      actingUserId = requesterAId
      actingIsOwner = false
      actingPermissions = new Set(["campaigns:read"])
      const { POST: createRequest } = await import("./admin-requests/route")
      const resA = await createRequest(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ reason: "Need to submit campaigns while the owner is away." }),
        }),
      )
      expect(resA.status).toBe(201)
      const requestA = await resA.json()

      actingUserId = requesterBId
      const resB = await createRequest(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ reason: "Need to manage billing for the quarter." }),
        }),
      )
      expect(resB.status).toBe(201)
      const requestB = await resB.json()

      actingUserId = ownerId
      actingIsOwner = true
      actingPermissions = new Set(["team:manage", "org:manage"])
      const { POST: review } = await import("./admin-requests/[id]/route")

      const approveA = await review(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ decision: "approve" }),
        }),
        { params: Promise.resolve({ id: String(requestA.id) }) },
      )
      expect(approveA.status).toBe(200)

      const approveB = await review(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ decision: "approve" }),
        }),
        { params: Promise.resolve({ id: String(requestB.id) }) },
      )
      expect(approveB.status).toBe(200)

      const memberA = await prisma.advertiserMember.findUnique({
        where: { clerk_user_id: requesterAId },
      })
      const memberB = await prisma.advertiserMember.findUnique({
        where: { clerk_user_id: requesterBId },
      })

      expect(memberA?.is_owner).toBe(false)
      expect(memberA?.role_id).toBe(adminRoleId)
      expect(memberB?.is_owner).toBe(false)
      expect(memberB?.role_id).toBe(adminRoleId)

      // Exactly one owner remains — approving admin requests never mints a
      // second owner.
      const owners = await prisma.advertiserMember.count({ where: { org_id: orgId, is_owner: true } })
      expect(owners).toBe(1)
    },
    30_000,
  )
})
