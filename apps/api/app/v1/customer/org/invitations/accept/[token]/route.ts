import { NextResponse } from "next/server"

import { hashAdvertiserInviteToken } from "@/lib/advertiser-invite-token"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, requireCustomerIdentityAccess } from "@/lib/api-utils"
import { invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { getCustomerEmail } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ token: string }> }

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireCustomerIdentityAccess()
  if (auth.error) return auth.error

  const rawToken = (await params).token
  if (!rawToken?.trim()) return jsonError("Missing invitation token", 400)

  const tokenHash = hashAdvertiserInviteToken(rawToken)
  const invitation = await prisma.advertiserInvitation.findUnique({
    where: { token_hash: tokenHash },
  })
  if (!invitation || invitation.revoked_at) return jsonError("Invitation not found", 404)
  if (invitation.accepted_at) return jsonError("Invitation already accepted", 409)
  if (invitation.expires_at.getTime() <= Date.now()) {
    return jsonError("Invitation has expired", 410)
  }

  const existing = await prisma.advertiserMember.findUnique({
    where: { clerk_user_id: auth.access.userId },
    include: { role: true },
  })

  if (existing && !existing.removed_at) {
    return jsonError("already belongs to an organization", 409)
  }
  if (existing?.removed_at && existing.org_id !== invitation.org_id) {
    return jsonError("already belongs to an organization", 409)
  }

  const actorEmail = await getCustomerEmail(auth.access.userId)
  if (actorEmail && actorEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    return jsonError("Sign in with the email address this invitation was sent to", 403)
  }

  const member = await prisma.$transaction(async (tx) => {
    let row
    if (existing?.removed_at && existing.org_id === invitation.org_id) {
      row = await tx.advertiserMember.update({
        where: { id: existing.id },
        data: {
          removed_at: null,
          role_id: invitation.role_id,
          is_owner: false,
        },
        include: { role: true },
      })
    } else {
      row = await tx.advertiserMember.create({
        data: {
          org_id: invitation.org_id,
          clerk_user_id: auth.access.userId,
          role_id: invitation.role_id,
          is_owner: false,
        },
        include: { role: true },
      })
    }
    await tx.advertiserInvitation.update({
      where: { id: invitation.id },
      data: { accepted_at: new Date() },
    })
    return row
  })

  invalidateAdvertiserAccessCache(auth.access.userId)

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "advertiser_invitation",
    entity_id: invitation.id,
    summary: `Accepted invitation to org #${invitation.org_id}`,
  })

  return NextResponse.json({
    orgId: member.org_id,
    memberId: member.id,
    roleId: member.role_id,
    roleName: member.role?.name ?? null,
  })
}
