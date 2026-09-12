import type {
  AdvertiserInvitationDto,
  AdvertiserMemberDto,
  AdvertiserOrgDto,
  AdvertiserRoleDto,
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

  const starterOrder = ["Manager", "Member", "Viewer"]
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
  expires_at: Date
}): AdvertiserInvitationDto["status"] {
  if (row.accepted_at) return "accepted"
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
  if (clerkUserId) {
    const me = await prisma.advertiserMember.findFirst({
      where: { org_id: orgId, clerk_user_id: clerkUserId, removed_at: null },
      include: { role: true },
    })
    if (me?.is_owner) myRoleName = "Admin"
    else if (me?.role?.name) myRoleName = me.role.name
  }

  return { id: org.id, name: org.name, memberCount, myRoleName }
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
    roleName: member.is_owner ? "Admin" : (member.role?.name ?? null),
    joinedAt: member.created_at.toISOString(),
  }
}

export function toInvitationDto(row: {
  id: number
  email: string
  role_id: number | null
  created_at: Date
  expires_at: Date
  accepted_at: Date | null
  revoked_at: Date | null
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

