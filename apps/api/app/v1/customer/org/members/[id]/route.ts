import { NextResponse } from "next/server"

import { advertiserMemberUpdateSchema } from "@workspace/ops-contracts"

import { countOrgOwners, getAssignableRole, toMemberDto } from "@/lib/advertiser-org"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (id == null) return jsonError("Invalid member id", 400)

  const parsed = await parseJsonBody(req, advertiserMemberUpdateSchema)
  if ("error" in parsed) return parsed.error

  const member = await prisma.advertiserMember.findFirst({
    where: { id, org_id: auth.access.orgId, removed_at: null },
    include: { role: true },
  })
  if (!member) return jsonError("Member not found", 404)

  const nextIsOwner = parsed.data.isOwner ?? member.is_owner
  let nextRoleId = parsed.data.roleId !== undefined ? parsed.data.roleId : member.role_id

  if (nextIsOwner) {
    nextRoleId = null
  } else if (nextRoleId != null) {
    const role = await getAssignableRole(auth.access.orgId, nextRoleId)
    if (!role) return jsonError("Unknown role", 400)
  } else if (!nextIsOwner && nextRoleId == null) {
    return jsonError("Non-admins must have a role", 400)
  }

  if (member.is_owner && !nextIsOwner) {
    const remainingOwners = await countOrgOwners(auth.access.orgId, member.id)
    if (remainingOwners < 1) {
      return jsonError("Cannot demote the last admin", 409)
    }
  }

  const updated = await prisma.advertiserMember.update({
    where: { id: member.id },
    data: { is_owner: nextIsOwner, role_id: nextRoleId },
    include: { role: true },
  })

  invalidateAdvertiserAccessCache(updated.clerk_user_id)

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "advertiser_member",
    entity_id: updated.id,
    summary: nextIsOwner
      ? `Promoted member #${updated.id} to admin`
      : `Changed member #${updated.id} role to ${updated.role?.name ?? "none"}`,
  })

  return NextResponse.json(await toMemberDto(updated))
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (id == null) return jsonError("Invalid member id", 400)

  const member = await prisma.advertiserMember.findFirst({
    where: { id, org_id: auth.access.orgId, removed_at: null },
  })
  if (!member) return jsonError("Member not found", 404)

  if (member.is_owner) {
    const remainingOwners = await countOrgOwners(auth.access.orgId, member.id)
    if (remainingOwners < 1) {
      return jsonError("Cannot remove the last admin", 409)
    }
  }

  await prisma.advertiserMember.update({
    where: { id: member.id },
    data: { removed_at: new Date(), is_owner: false },
  })
  invalidateAdvertiserAccessCache(member.clerk_user_id)

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "advertiser_member",
    entity_id: member.id,
    summary: `Removed member #${member.id} from the organization`,
  })

  return NextResponse.json({ success: true })
}
