import { NextResponse } from "next/server"

import { advertiserRoleUpdateSchema } from "@workspace/ops-contracts"

import { toRoleDto } from "@/lib/advertiser-org"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ roleId: string }> }

/**
 * Update an org role. Saving a shared starter clones it for this org and
 * reassigns this org's members/invites onto the clone (starters stay global).
 */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error
  if (!auth.access.isOwner) return jsonError("Only an admin can edit roles", 403)

  const id = parseId((await params).roleId)
  if (id == null) return jsonError("Invalid role id", 400)

  const parsed = await parseJsonBody(req, advertiserRoleUpdateSchema)
  if ("error" in parsed) return parsed.error

  const existing = await prisma.advertiserRole.findUnique({ where: { id } })
  if (!existing) return jsonError("Role not found", 404)
  if (existing.org_id != null && existing.org_id !== auth.access.orgId) {
    return jsonError("Role not found", 404)
  }

  const nextName = parsed.data.name?.trim() ?? existing.name
  const nextPermissions =
    parsed.data.permissions != null
      ? [...new Set(parsed.data.permissions)]
      : existing.permissions

  if (nextName.toLowerCase() !== existing.name.toLowerCase()) {
    const clash = await prisma.advertiserRole.findFirst({
      where: {
        id: { not: existing.id },
        name: { equals: nextName, mode: "insensitive" },
        OR: [{ org_id: auth.access.orgId }, { org_id: null }],
      },
    })
    if (clash) return jsonError(`A role named "${nextName}" already exists`, 409)
  }

  // Clone shared starter → org role, then re-point this org's assignments.
  if (existing.org_id == null) {
    const already = await prisma.advertiserRole.findFirst({
      where: {
        org_id: auth.access.orgId,
        name: { equals: nextName, mode: "insensitive" },
      },
    })
    if (already) {
      return jsonError(
        `This organization already customized "${already.name}". Edit that role instead.`,
        409,
      )
    }

    const { role, memberIds } = await prisma.$transaction(async (tx) => {
      const role = await tx.advertiserRole.create({
        data: {
          org_id: auth.access.orgId,
          name: nextName,
          permissions: nextPermissions,
        },
      })
      const members = await tx.advertiserMember.findMany({
        where: {
          org_id: auth.access.orgId,
          role_id: existing.id,
          removed_at: null,
        },
        select: { id: true, clerk_user_id: true },
      })
      await tx.advertiserMember.updateMany({
        where: { org_id: auth.access.orgId, role_id: existing.id },
        data: { role_id: role.id },
      })
      await tx.advertiserInvitation.updateMany({
        where: {
          org_id: auth.access.orgId,
          role_id: existing.id,
          accepted_at: null,
          revoked_at: null,
        },
        data: { role_id: role.id },
      })
      return { role, memberIds: members.map((m) => m.clerk_user_id) }
    })

    for (const clerkUserId of memberIds) {
      invalidateAdvertiserAccessCache(clerkUserId)
    }

    await auditFromCustomerUser(auth.access.userId, {
      action: "create",
      entity_type: "advertiser_role",
      entity_id: role.id,
      summary: `Customized starter role "${existing.name}" as "${role.name}"`,
    })

    const memberCount = await prisma.advertiserMember.count({
      where: { org_id: auth.access.orgId, role_id: role.id, removed_at: null },
    })
    return NextResponse.json(toRoleDto({ ...role, _count: { members: memberCount } }))
  }

  const role = await prisma.advertiserRole.update({
    where: { id: existing.id },
    data: { name: nextName, permissions: nextPermissions },
  })

  const members = await prisma.advertiserMember.findMany({
    where: { org_id: auth.access.orgId, role_id: role.id, removed_at: null },
    select: { clerk_user_id: true },
  })
  for (const m of members) invalidateAdvertiserAccessCache(m.clerk_user_id)

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "advertiser_role",
    entity_id: role.id,
    summary: `Updated role "${role.name}"`,
  })

  return NextResponse.json(toRoleDto({ ...role, _count: { members: members.length } }))
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error
  if (!auth.access.isOwner) return jsonError("Only an admin can delete roles", 403)

  const id = parseId((await params).roleId)
  if (id == null) return jsonError("Invalid role id", 400)

  const existing = await prisma.advertiserRole.findUnique({
    where: { id },
    include: {
      _count: {
        select: { members: { where: { org_id: auth.access.orgId, removed_at: null } } },
      },
    },
  })
  if (!existing) return NextResponse.json({ success: true })
  if (existing.org_id == null) {
    return jsonError("Starter roles can't be deleted — customize them instead", 400)
  }
  if (existing.org_id !== auth.access.orgId) return jsonError("Role not found", 404)
  if (existing._count.members > 0) {
    return jsonError(
      `Cannot delete "${existing.name}" — ${existing._count.members} member(s) still assigned. Reassign them first.`,
      400,
    )
  }

  const pendingInvites = await prisma.advertiserInvitation.count({
    where: {
      org_id: auth.access.orgId,
      role_id: existing.id,
      accepted_at: null,
      revoked_at: null,
    },
  })
  if (pendingInvites > 0) {
    return jsonError(
      `Cannot delete "${existing.name}" — ${pendingInvites} pending invitation(s) still use it.`,
      400,
    )
  }

  await prisma.advertiserRole.delete({ where: { id: existing.id } })

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "advertiser_role",
    entity_id: id,
    summary: `Deleted role "${existing.name}"`,
  })

  return NextResponse.json({ success: true })
}
