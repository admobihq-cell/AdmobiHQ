import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import {
  generateAdvertiserInviteToken,
  hashAdvertiserInviteToken,
} from "@/lib/advertiser-invite-token"

const databaseUrl = process.env.DATABASE_URL

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
    requireCustomerPermissionAccess: vi.fn(async (permission: string) => {
      if (!actingIsOwner && !actingPermissions.has(permission)) {
        return {
          error: new Response(JSON.stringify({ error: `Forbidden — "${permission}" access required` }), {
            status: 403,
          }),
        }
      }
      return {
        access: {
          userId: actingUserId,
          orgId: actingOrgId,
          isOwner: actingIsOwner,
          permissions: actingPermissions,
        },
      }
    }),
    requireCustomerIdentityAccess: vi.fn(async () => ({
      access: { userId: actingUserId },
    })),
  }
})

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
}))
vi.mock("@/lib/email/render-template", () => ({
  renderTemplate: vi.fn(async () => "<html></html>"),
}))
vi.mock("@/lib/customer-clerk", () => ({
  getCustomerEmail: vi.fn(async (id: string) => `${id}@example.com`),
  getCustomerName: vi.fn(async () => "Test User"),
  getCustomerCompanyName: vi.fn(async () => "Test Co"),
  customerClerkClient: { users: { getUserList: vi.fn(async () => ({ data: [] })) } },
}))
vi.mock("@/lib/audit", () => ({
  auditFromCustomerUser: vi.fn(async () => undefined),
}))

describe.skipIf(!databaseUrl)("customer org team routes", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stamp = Date.now()
  const ownerId = `org-test-owner-${stamp}`
  const inviteeId = `org-test-invitee-${stamp}`
  let orgId = 0
  let memberRoleId = 0
  let ownerMemberId = 0

  beforeAll(async () => {
    const role =
      (await prisma.advertiserRole.findFirst({ where: { org_id: null, name: "Member" } })) ??
      (await prisma.advertiserRole.create({
        data: { org_id: null, name: "Member", permissions: ["campaigns:read", "campaigns:write"] },
      }))
    memberRoleId = role.id

    const org = await prisma.advertiserOrg.create({ data: { name: "Org Test Co" } })
    orgId = org.id
    const owner = await prisma.advertiserMember.create({
      data: { org_id: org.id, clerk_user_id: ownerId, is_owner: true },
    })
    ownerMemberId = owner.id
    actingUserId = ownerId
    actingOrgId = orgId
    actingIsOwner = true
  }, 30_000)

  afterAll(async () => {
    await prisma.advertiserInvitation.deleteMany({ where: { org_id: orgId } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.advertiserMember.deleteMany({
      where: { clerk_user_id: { in: [ownerId, inviteeId] } },
    })
    await prisma.$disconnect()
  })

  it(
    "refuses to remove the last owner",
    async () => {
      const { DELETE } = await import("./members/[id]/route")
      const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
        params: Promise.resolve({ id: String(ownerMemberId) }),
      })
      expect(res.status).toBe(409)
    },
    30_000,
  )

  it(
    "accept joins the inviting org without creating a solo org",
    async () => {
      const token = generateAdvertiserInviteToken()
      await prisma.advertiserInvitation.create({
        data: {
          org_id: orgId,
          email: `${inviteeId}@example.com`,
          role_id: memberRoleId,
          token_hash: hashAdvertiserInviteToken(token),
          expires_at: new Date(Date.now() + 86_400_000),
          invited_by_clerk_user_id: ownerId,
        },
      })

      actingUserId = inviteeId
      const { POST } = await import("./invitations/accept/[token]/route")
      const res = await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ token }),
      })
      expect(res.status).toBe(200)

      const member = await prisma.advertiserMember.findUnique({
        where: { clerk_user_id: inviteeId },
      })
      expect(member?.org_id).toBe(orgId)
      expect(member?.is_owner).toBe(false)

      const soloOrgs = await prisma.advertiserOrg.count({
        where: { members: { every: { clerk_user_id: inviteeId } }, id: { not: orgId } },
      })
      expect(soloOrgs).toBe(0)

      actingUserId = ownerId
    },
    30_000,
  )

  it(
    "returns 403 when a non-owner without team:manage lists members",
    async () => {
      actingUserId = inviteeId
      actingOrgId = orgId
      actingIsOwner = false
      actingPermissions = new Set(["campaigns:read"])

      const { GET } = await import("./members/route")
      const res = await GET()
      expect(res.status).toBe(403)

      actingUserId = ownerId
      actingIsOwner = true
      actingPermissions = new Set(["team:manage", "org:manage"])
    },
    30_000,
  )

  it(
    "blocks account deletion while the user is the sole owner",
    async () => {
      actingUserId = ownerId
      actingOrgId = orgId
      actingIsOwner = true

      const { GET } = await import("./deletion-status/route")
      const res = await GET()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.isSoleOwner).toBe(true)
      expect(body.canDeleteAccount).toBe(false)
    },
    30_000,
  )

  it(
    "soft-deletes a member and hides them from the roster",
    async () => {
      const invitee = await prisma.advertiserMember.findUnique({
        where: { clerk_user_id: inviteeId },
      })
      expect(invitee).toBeTruthy()

      actingUserId = ownerId
      actingIsOwner = true
      actingPermissions = new Set(["team:manage", "org:manage"])

      const { DELETE } = await import("./members/[id]/route")
      const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
        params: Promise.resolve({ id: String(invitee!.id) }),
      })
      expect(res.status).toBe(200)

      const removed = await prisma.advertiserMember.findUnique({
        where: { clerk_user_id: inviteeId },
      })
      expect(removed?.removed_at).not.toBeNull()

      const { GET } = await import("./members/route")
      const list = await GET()
      expect(list.status).toBe(200)
      const body = await list.json()
      expect(body.members.every((m: { clerkUserId: string }) => m.clerkUserId !== inviteeId)).toBe(
        true,
      )
    },
    30_000,
  )

  it(
    "transfers ownership and clears the sole-owner block",
    async () => {
      // Reactivate invitee so they can become owner.
      const invitee = await prisma.advertiserMember.update({
        where: { clerk_user_id: inviteeId },
        data: { removed_at: null, is_owner: false, role_id: memberRoleId },
      })

      actingUserId = ownerId
      actingOrgId = orgId
      actingIsOwner = true
      actingPermissions = new Set(["team:manage", "org:manage"])

      const { POST } = await import("./transfer-ownership/route")
      const res = await POST(
        new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: invitee.id }),
        }),
      )
      expect(res.status).toBe(200)

      const [former, next] = await Promise.all([
        prisma.advertiserMember.findUnique({ where: { clerk_user_id: ownerId } }),
        prisma.advertiserMember.findUnique({ where: { clerk_user_id: inviteeId } }),
      ])
      expect(former?.is_owner).toBe(false)
      expect(next?.is_owner).toBe(true)

      const { GET } = await import("./deletion-status/route")
      const status = await GET()
      const body = await status.json()
      expect(body.isSoleOwner).toBe(false)
      expect(body.canDeleteAccount).toBe(true)
    },
    30_000,
  )
})
