import { NextResponse } from "next/server"

import { hashAdvertiserInviteToken } from "@/lib/advertiser-invite-token"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, requireCustomerIdentityAccess } from "@/lib/api-utils"
import { getCustomerEmail } from "@/lib/customer-clerk"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ token: string }> }

/**
 * Turns an invitation down. Recorded as `declined_at` rather than `revoked_at`
 * so the inviting admin can tell "they said no" from "I withdrew it" — the row
 * would otherwise just disappear from their pending list with no explanation.
 *
 * Declining never touches the caller's own org.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireCustomerIdentityAccess()
  if (auth.error) return auth.error

  const limited = await checkRateLimit(req, "advertiser-invite-decline", {
    limit: 20,
    windowSeconds: 600,
    identifier: auth.access.userId,
  })
  if (limited) return limited

  const rawToken = (await params).token
  if (!rawToken?.trim()) return jsonError("Missing invitation token", 400)

  const invitation = await prisma.advertiserInvitation.findUnique({
    where: { token_hash: hashAdvertiserInviteToken(rawToken) },
  })
  if (!invitation || invitation.revoked_at) return jsonError("Invitation not found", 404)
  if (invitation.accepted_at) return jsonError("Invitation already accepted", 409)
  if (invitation.declined_at) return NextResponse.json({ success: true })

  // Same fail-closed identity check as accept: only the invited person may
  // decide, so a leaked token can't be used to kill someone else's invitation.
  const actorEmail = await getCustomerEmail(auth.access.userId)
  if (!actorEmail || actorEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    return jsonError("Sign in with the email address this invitation was sent to", 403)
  }

  await prisma.advertiserInvitation.update({
    where: { id: invitation.id },
    data: { declined_at: new Date() },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "advertiser_invitation",
    entity_id: invitation.id,
    summary: `Declined invitation to org #${invitation.org_id}`,
  })

  return NextResponse.json({ success: true })
}
