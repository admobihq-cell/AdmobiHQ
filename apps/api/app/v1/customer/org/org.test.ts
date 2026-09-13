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
      const body = await res.json()
      expect(body.org).toEqual({
        id: orgId,
        name: "Org Test Co",
        memberCount: 2,
        myRoleName: "Member",
      })

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

describe.skipIf(!databaseUrl)("leave organization and accept-invitation conflicts", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stamp = Date.now()
  const orgIds: number[] = []
  const userIds: string[] = []

  afterAll(async () => {
    await prisma.advertiserInvitation.deleteMany({ where: { org_id: { in: orgIds } } })
    await prisma.advertiserMember.deleteMany({ where: { clerk_user_id: { in: userIds } } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: orgIds } } })
    await prisma.$disconnect()
  })

  it(
    "a non-owner can leave; the sole owner is refused until they transfer",
    async () => {
      const ownerId = `leave-test-owner-${stamp}`
      const memberId = `leave-test-member-${stamp}`
      userIds.push(ownerId, memberId)

      const org = await prisma.advertiserOrg.create({ data: { name: "Leave Test Org" } })
      orgIds.push(org.id)
      await prisma.advertiserMember.create({
        data: { org_id: org.id, clerk_user_id: ownerId, is_owner: true },
      })
      const memberRole =
        (await prisma.advertiserRole.findFirst({ where: { org_id: null, name: "Member" } })) ??
        (await prisma.advertiserRole.create({
          data: { org_id: null, name: "Member", permissions: ["campaigns:read"] },
        }))
      await prisma.advertiserMember.create({
        data: { org_id: org.id, clerk_user_id: memberId, role_id: memberRole.id, is_owner: false },
      })

      actingUserId = memberId
      actingOrgId = org.id
      actingIsOwner = false

      const { POST: leaveAsMember } = await import("./leave/route")
      const memberRes = await leaveAsMember()
      expect(memberRes.status).toBe(200)
      const leftMember = await prisma.advertiserMember.findUnique({
        where: { clerk_user_id: memberId },
      })
      expect(leftMember?.removed_at).not.toBeNull()

      actingUserId = ownerId
      actingIsOwner = true

      const { POST: leaveAsOwner } = await import("./leave/route")
      const ownerRes = await leaveAsOwner()
      expect(ownerRes.status).toBe(409)
      const stillOwner = await prisma.advertiserMember.findUnique({
        where: { clerk_user_id: ownerId },
      })
      expect(stillOwner?.removed_at).toBeNull()
    },
    30_000,
  )

  it(
    "accept: an untouched solo org can be left automatically via leaveSoleOrg",
    async () => {
      const aliceId = `accept-solo-alice-${stamp}`
      const inviterId = `accept-solo-inviter-${stamp}`
      userIds.push(aliceId, inviterId)

      const soloOrg = await prisma.advertiserOrg.create({ data: { name: "Alice's Organization" } })
      const invitingOrg = await prisma.advertiserOrg.create({ data: { name: "Invited Co" } })
      orgIds.push(soloOrg.id, invitingOrg.id)
      await prisma.advertiserMember.create({
        data: { org_id: soloOrg.id, clerk_user_id: aliceId, is_owner: true },
      })
      await prisma.advertiserMember.create({
        data: { org_id: invitingOrg.id, clerk_user_id: inviterId, is_owner: true },
      })

      const token = generateAdvertiserInviteToken()
      await prisma.advertiserInvitation.create({
        data: {
          org_id: invitingOrg.id,
          email: `${aliceId}@example.com`,
          role_id: null,
          token_hash: hashAdvertiserInviteToken(token),
          expires_at: new Date(Date.now() + 86_400_000),
          invited_by_clerk_user_id: inviterId,
        },
      })

      actingUserId = aliceId
      const { POST } = await import("./invitations/accept/[token]/route")

      const conflictRes = await POST(
        new Request("http://localhost", { method: "POST" }),
        { params: Promise.resolve({ token }) },
      )
      expect(conflictRes.status).toBe(409)
      const conflictBody = await conflictRes.json()
      expect(conflictBody.reason).toBe("solo_org_conflict")
      expect(conflictBody.currentOrgName).toBe("Alice's Organization")

      const resolvedRes = await POST(
        new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaveSoleOrg: true }),
        }),
        { params: Promise.resolve({ token }) },
      )
      expect(resolvedRes.status).toBe(200)
      const resolvedBody = await resolvedRes.json()
      expect(resolvedBody.orgId).toBe(invitingOrg.id)

      const deletedSoloOrg = await prisma.advertiserOrg.findUnique({ where: { id: soloOrg.id } })
      expect(deletedSoloOrg).toBeNull()
      orgIds.splice(orgIds.indexOf(soloOrg.id), 1)

      const aliceMembership = await prisma.advertiserMember.findUnique({
        where: { clerk_user_id: aliceId },
      })
      expect(aliceMembership?.org_id).toBe(invitingOrg.id)
    },
    30_000,
  )

  it(
    "accept: a real org with teammates returns tailored guidance, not an auto-resolve",
    async () => {
      const bobId = `accept-real-bob-${stamp}`
      const bobOwnerId = `accept-real-owner-${stamp}`
      const inviterId = `accept-real-inviter-${stamp}`
      userIds.push(bobId, bobOwnerId, inviterId)

      const bobsOrg = await prisma.advertiserOrg.create({ data: { name: "Bob's Team" } })
      const invitingOrg = await prisma.advertiserOrg.create({ data: { name: "Another Co" } })
      orgIds.push(bobsOrg.id, invitingOrg.id)
      await prisma.advertiserMember.create({
        data: { org_id: bobsOrg.id, clerk_user_id: bobOwnerId, is_owner: true },
      })
      const memberRole =
        (await prisma.advertiserRole.findFirst({ where: { org_id: null, name: "Member" } })) ??
        (await prisma.advertiserRole.create({
          data: { org_id: null, name: "Member", permissions: ["campaigns:read"] },
        }))
      await prisma.advertiserMember.create({
        data: { org_id: bobsOrg.id, clerk_user_id: bobId, role_id: memberRole.id, is_owner: false },
      })
      await prisma.advertiserMember.create({
        data: { org_id: invitingOrg.id, clerk_user_id: inviterId, is_owner: true },
      })

      const token = generateAdvertiserInviteToken()
      await prisma.advertiserInvitation.create({
        data: {
          org_id: invitingOrg.id,
          email: `${bobId}@example.com`,
          role_id: null,
          token_hash: hashAdvertiserInviteToken(token),
          expires_at: new Date(Date.now() + 86_400_000),
          invited_by_clerk_user_id: inviterId,
        },
      })

      actingUserId = bobId
      const { POST } = await import("./invitations/accept/[token]/route")
      const res = await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ token }),
      })
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.reason).toBeUndefined()
      expect(body.error).toContain("Bob's Team")
      expect(body.error).toContain("leave it from Settings")
    },
    30_000,
  )
})
