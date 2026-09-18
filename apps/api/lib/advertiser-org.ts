import {
  ADVERTISER_PERMISSIONS,
  type AdvertiserAdminRequestDto,
  type AdvertiserInvitationDto,
  type AdvertiserMemberDto,
  type AdvertiserOrgDto,
  type AdvertiserPermission,
  type AdvertiserRoleDto,
} from "@workspace/ops-contracts"

import { customerClerkClient, getCustomerEmail, getCustomerName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function countOrgOwners(orgId: number, excludeMemberId?: number): Promise<number> {
  return prisma.advertiserMember.count({
    where: {
      org_id: orgId,
      is_owner: true,
      removed_at: null,
      ...(excludeMemberId != null ? { id: { not: excludeMemberId } } : {}),
    },
  })
}

/** The role id an approved admin request should grant: the org's own
 * "Admin" role if it has customized one, else the shared starter. */
export async function getAdminRoleId(orgId: number): Promise<number | null> {
  const roles = await prisma.advertiserRole.findMany({
    where: { name: "Admin", OR: [{ org_id: orgId }, { org_id: null }] },
  })
  return (roles.find((r) => r.org_id === orgId) ?? roles.find((r) => r.org_id == null))?.id ?? null
}

export async function getAssignableRole(orgId: number, roleId: number) {
  return prisma.advertiserRole.findFirst({
    where: {
      id: roleId,
      OR: [{ org_id: null }, { org_id: orgId }],
    },
  })
}

/** @deprecated Prefer getAssignableRole — kept name for call-site clarity during invites. */
export async function getStarterRoleOrThrow(roleId: number) {
  return prisma.advertiserRole.findFirst({
    where: { id: roleId, org_id: null },
  })
}

/**
 * Roles an org can assign: org-custom roles, plus starters that this org has not
 * overridden by cloning under the same name.
 */
export async function listAssignableRoles(orgId: number) {
  const [starters, customs] = await Promise.all([
    prisma.advertiserRole.findMany({
      where: { org_id: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { members: { where: { org_id: orgId, removed_at: null } } },
        },
      },
    }),
    prisma.advertiserRole.findMany({
      where: { org_id: orgId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { members: { where: { org_id: orgId, removed_at: null } } },
        },
      },
    }),
  ])

  const overridden = new Set(customs.map((r) => r.name.toLowerCase()))
  const effective = [
    ...customs,
    ...starters.filter((r) => !overridden.has(r.name.toLowerCase())),
  ]

  const starterOrder = ["Admin", "Member"]
  effective.sort((a, b) => {
    const ai = starterOrder.indexOf(a.name)
    const bi = starterOrder.indexOf(b.name)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return a.name.localeCompare(b.name)
  })

  return effective
}

export function toRoleDto(role: {
  id: number
  name: string
  permissions: string[]
  org_id: number | null
  _count?: { members: number }
}): AdvertiserRoleDto {
  return {
    id: role.id,
    name: role.name,
    permissions: role.permissions as AdvertiserRoleDto["permissions"],
    orgId: role.org_id,
    isStarter: role.org_id == null,
    memberCount: role._count?.members ?? 0,
  }
}

export function invitationStatus(row: {
  accepted_at: Date | null
  revoked_at: Date | null
  declined_at: Date | null
  expires_at: Date
}): AdvertiserInvitationDto["status"] {
  if (row.accepted_at) return "accepted"
  if (row.declined_at) return "declined"
  if (row.revoked_at) return "revoked"
  if (row.expires_at.getTime() <= Date.now()) return "expired"
  return "pending"
}

export async function toOrgDto(
  orgId: number,
  clerkUserId?: string,
): Promise<AdvertiserOrgDto | null> {
  const org = await prisma.advertiserOrg.findUnique({ where: { id: orgId } })
  if (!org) return null
  const memberCount = await prisma.advertiserMember.count({
    where: { org_id: orgId, removed_at: null },
  })

  let myRoleName = "Member"
  let isOwner = false
  let permissions: AdvertiserPermission[] = []
  if (clerkUserId) {
    const me = await prisma.advertiserMember.findFirst({
      where: { org_id: orgId, clerk_user_id: clerkUserId, removed_at: null },
      include: { role: true },
    })
    isOwner = me?.is_owner ?? false
    if (isOwner) {
      myRoleName = "Owner"
      permissions = [...ADVERTISER_PERMISSIONS]
    } else {
      if (me?.role?.name) myRoleName = me.role.name
      permissions = (me?.role?.permissions ?? []).filter((p): p is AdvertiserPermission =>
        (ADVERTISER_PERMISSIONS as readonly string[]).includes(p),
      )
    }
  }

  return {
    id: org.id,
    name: org.name,
    memberCount,
    myRoleName,
    isOwner,
    permissions,
    // Finance details are a billing:read concern, not general org metadata.
    billingEmail: isOwner || permissions.includes("billing:read") ? org.billing_email : null,
    taxPin: isOwner || permissions.includes("billing:read") ? org.tax_pin : null,
  }
}

export async function toMemberDto(member: {
  id: number
  clerk_user_id: string
  is_owner: boolean
  role_id: number | null
  created_at: Date
  role: { id: number; name: string } | null
}): Promise<AdvertiserMemberDto> {
  const [email, name] = await Promise.all([
    getCustomerEmail(member.clerk_user_id),
    getCustomerName(member.clerk_user_id),
  ])
  return {
    id: member.id,
    clerkUserId: member.clerk_user_id,
    email,
    name,
    isOwner: member.is_owner,
    roleId: member.role_id,
    roleName: member.is_owner ? "Owner" : (member.role?.name ?? null),
    joinedAt: member.created_at.toISOString(),
  }
}

/** Clerk caps getUserList at 100 ids per call. */
const CLERK_USER_BATCH = 100

/** Requester and reviewer identities resolved in one Clerk round trip. */
export async function toAdminRequestDtos(
  rows: {
    id: number
    status: string
    reason: string
    clerk_user_id: string
    reviewed_by_clerk_user_id: string | null
    reviewed_at: Date | null
    review_note: string | null
    created_at: Date
  }[],
): Promise<AdvertiserAdminRequestDto[]> {
  const identities = await resolveCustomerIdentities(
    rows.flatMap((r) => [r.clerk_user_id, r.reviewed_by_clerk_user_id].filter((v): v is string => !!v)),
  )

  return rows.map((row) => {
    const requester = identities.get(row.clerk_user_id)
    const reviewer = row.reviewed_by_clerk_user_id
      ? identities.get(row.reviewed_by_clerk_user_id)
      : undefined
    return {
      id: row.id,
      status: row.status as AdvertiserAdminRequestDto["status"],
      reason: row.reason,
      clerkUserId: row.clerk_user_id,
      name: requester?.name ?? null,
      email: requester?.email ?? null,
      reviewedByName: reviewer?.name ?? reviewer?.email ?? null,
      reviewedAt: row.reviewed_at?.toISOString() ?? null,
      reviewNote: row.review_note,
      createdAt: row.created_at.toISOString(),
    }
  })
}

/**
 * Display names/emails for many Clerk user ids in one round trip. Returns an
 * empty map on failure rather than throwing — a Clerk hiccup should render a
 * roster without names, not a 500.
 */
export async function resolveCustomerIdentities(
  clerkUserIds: string[],
): Promise<Map<string, { email: string | null; name: string | null }>> {
  const unique = [...new Set(clerkUserIds)]
  const byId = new Map<string, { email: string | null; name: string | null }>()
  if (!unique.length) return byId

  for (let i = 0; i < unique.length; i += CLERK_USER_BATCH) {
    const batch = unique.slice(i, i + CLERK_USER_BATCH)
    try {
      const { data } = await customerClerkClient.users.getUserList({
        userId: batch,
        limit: batch.length,
      })
      for (const user of data) {
        const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        byId.set(user.id, {
          email: primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null,
          name: user.firstName ?? user.username ?? null,
        })
      }
    } catch (error) {
      console.error("[advertiser-org] failed to resolve customer identities:", error)
    }
  }
  return byId
}

/** Display label for a campaign's author. Null for pre-org campaigns whose * clerk_user_id was never set, and when Clerk can't resolve the user. */
export async function resolveCampaignAuthorName(
  clerkUserId: string | null,
): Promise<string | null> {
  if (!clerkUserId) return null
  const identity = (await resolveCustomerIdentities([clerkUserId])).get(clerkUserId)
  return identity?.name ?? identity?.email ?? null
}

/** Batched toMemberDto — one Clerk call for the whole roster instead of two per row. */export async function toMemberDtos(
  members: {
    id: number
    clerk_user_id: string
    is_owner: boolean
    role_id: number | null
    created_at: Date
    role: { id: number; name: string } | null
  }[],
): Promise<AdvertiserMemberDto[]> {
  const identities = await resolveCustomerIdentities(members.map((m) => m.clerk_user_id))
  return members.map((member) => {
    const identity = identities.get(member.clerk_user_id)
    return {
      id: member.id,
      clerkUserId: member.clerk_user_id,
      email: identity?.email ?? null,
      name: identity?.name ?? null,
      isOwner: member.is_owner,
      roleId: member.role_id,
      roleName: member.is_owner ? "Owner" : (member.role?.name ?? null),
      joinedAt: member.created_at.toISOString(),
    }
  })
}

export function toInvitationDto(row: {
  id: number
  email: string
  role_id: number | null
  created_at: Date
  expires_at: Date
  accepted_at: Date | null
  revoked_at: Date | null
  declined_at: Date | null
  role: { name: string } | null
}): AdvertiserInvitationDto {
  return {
    id: row.id,
    email: row.email,
    roleId: row.role_id,
    roleName: row.role?.name ?? null,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    status: invitationStatus(row),
  }
}

/** Best-effort display string for the acting inviter in email copy. */
export async function resolveInviterLabel(clerkUserId: string): Promise<string> {
  const [name, email] = await Promise.all([
    getCustomerName(clerkUserId),
    getCustomerEmail(clerkUserId),
  ])
  return name ?? email ?? "A teammate"
}

export async function findClerkUserIdByEmail(email: string): Promise<string | null> {
  try {
    const { data } = await customerClerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    })
    return data[0]?.id ?? null
  } catch {
    return null
  }
}

/**
 * What leaving or deleting an org would strand. Campaigns and support cases are
 * detached (org_id = null) rather than deleted, and campaign reads are scoped
 * purely by org_id — so a detached campaign is unreachable by every advertiser
 * afterwards. Callers surface these counts before asking for confirmation.
 */
export async function getOrgDetachmentImpact(
  orgId: number,
): Promise<{ campaignCount: number; supportCaseCount: number }> {
  const [campaignCount, supportCaseCount] = await Promise.all([
    prisma.campaign.count({ where: { org_id: orgId } }),
    prisma.supportCase.count({ where: { org_id: orgId } }),
  ])
  return { campaignCount, supportCaseCount }
}

/** The auto-generated names lazy bootstrap gives an org when sign-up skipped
 * the company field. Matching one means the user never chose it. */
function hasDefaultOrgName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed === "" || trimmed === "My Organization" || /^.+'s Organization$/.test(trimmed)
}

/**
 * True when an org is the throwaway one lazy bootstrap hands every advertiser
 * on first request: sole member, never renamed, and nothing in it. Accepting an
 * invitation absorbs one of these silently instead of making the invitee
 * confirm abandoning a workspace they never knowingly created.
 */
export async function isUntouchedSoloOrg(
  orgId: number,
  memberIsOwner: boolean,
): Promise<boolean> {
  if (!memberIsOwner) return false

  const org = await prisma.advertiserOrg.findUnique({ where: { id: orgId } })
  if (!org || !hasDefaultOrgName(org.name)) return false

  const [memberCount, impact, pendingInvites] = await Promise.all([
    prisma.advertiserMember.count({ where: { org_id: orgId, removed_at: null } }),
    getOrgDetachmentImpact(orgId),
    prisma.advertiserInvitation.count({
      where: { org_id: orgId, accepted_at: null, revoked_at: null, declined_at: null },
    }),
  ])

  return (
    memberCount === 1 &&
    impact.campaignCount === 0 &&
    impact.supportCaseCount === 0 &&
    pendingInvites === 0
  )
}

/** Detaches an org's retained rows and deletes it. Campaigns and support cases
 * survive for the ops record; members/invitations/custom roles cascade. */
export async function detachAndDeleteOrg(orgId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.campaign.updateMany({ where: { org_id: orgId }, data: { org_id: null } })
    await tx.supportCase.updateMany({ where: { org_id: orgId }, data: { org_id: null } })
    await tx.advertiserOrg.delete({ where: { id: orgId } })
  })
}

