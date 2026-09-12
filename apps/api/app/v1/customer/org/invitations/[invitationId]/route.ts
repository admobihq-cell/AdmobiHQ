import { NextResponse } from "next/server"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ invitationId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error

  const invitationId = parseId((await params).invitationId)
  if (invitationId == null) return jsonError("Invalid invitation id", 400)

  const invitation = await prisma.advertiserInvitation.findFirst({
    where: { id: invitationId, org_id: auth.access.orgId },
  })
  if (!invitation) return jsonError("Invitation not found", 404)
  if (invitation.accepted_at) return jsonError("Invitation already accepted", 409)
  if (invitation.revoked_at) return jsonError("Invitation already revoked", 409)

  await prisma.advertiserInvitation.update({
    where: { id: invitation.id },
    data: { revoked_at: new Date() },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "advertiser_invitation",
    entity_id: invitation.id,
    summary: `Revoked invitation for ${invitation.email}`,
  })

  return NextResponse.json({ success: true })
}
