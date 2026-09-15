import { NextResponse } from "next/server"

import { hashAdvertiserInviteToken } from "@/lib/advertiser-invite-token"
import {
  detachAndDeleteOrg,
  getOrgDetachmentImpact,
  isUntouchedSoloOrg,
  toOrgDto,
} from "@/lib/advertiser-org"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, requireCustomerIdentityAccess } from "@/lib/api-utils"
import { invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { getCustomerEmail } from "@/lib/customer-clerk"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ token: string }> }

export async function POST(req: Request, { params }: Params) {
  const auth = await requireCustomerIdentityAccess()
  if (auth.error) return auth.error

  const limited = await checkRateLimit(req, "advertiser-invite-accept", {
    limit: 20,
    windowSeconds: 600,
    identifier: auth.access.userId,
  })
  if (limited) return limited

  const rawToken = (await params).token
  if (!rawToken?.trim()) return jsonError("Missing invitation token", 400)

  // Optional — only the "leave my solo org and join this one instead" retry
  // sends a body. A plain accept (no body / non-JSON) falls back to {}.
  const body = (await req.json().catch(() => ({}))) as { leaveSoleOrg?: boolean }
  const leaveSoleOrg = body.leaveSoleOrg === true

  const tokenHash = hashAdvertiserInviteToken(rawToken)
  const invitation = await prisma.advertiserInvitation.findUnique({
    where: { token_hash: tokenHash },
  })
  if (!invitation || invitation.revoked_at) return jsonError("Invitation not found", 404)
  if (invitation.accepted_at) return jsonError("Invitation already accepted", 409)
  if (invitation.expires_at.getTime() <= Date.now()) {
    return jsonError("Invitation has expired", 410)
  }

  // Checked before any membership mutation, and fails closed: an unresolvable
  // address must not let a leaked token be redeemed by whoever holds it.
  const actorEmail = await getCustomerEmail(auth.access.userId)
  if (!actorEmail || actorEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    return jsonError("Sign in with the email address this invitation was sent to", 403)
  }

  let existing = await prisma.advertiserMember.findUnique({
    where: { clerk_user_id: auth.access.userId },
    include: { role: true },
  })

  if (existing && !existing.removed_at) {
    const [memberCount, currentOrg] = await Promise.all([
      prisma.advertiserMember.count({ where: { org_id: existing.org_id, removed_at: null } }),
      prisma.advertiserOrg.findUnique({ where: { id: existing.org_id } }),
    ])
    const currentOrgName = currentOrg?.name ?? "your organization"
    // "Solo" means literally the only member — everyone gets one of these
    // just by visiting the app once (lazy bootstrap), so it's safe to offer
    // leaving it automatically. A real org with teammates is not.
    const isSoloOrg = existing.is_owner && memberCount === 1
    // The common case: a workspace the invitee never knowingly created and has
    // nothing in. Absorb it without a confirmation step.
    const untouched = isSoloOrg && (await isUntouchedSoloOrg(existing.org_id, existing.is_owner))

    if (isSoloOrg && (untouched || leaveSoleOrg)) {
      // Re-verified above in this same request — delete their solo org (same
      // shape as POST .../delete-organization) so the code below falls through
      // to creating a fresh membership in the invited org.
      await detachAndDeleteOrg(existing.org_id)
      invalidateAdvertiserAccessCache(auth.access.userId)
      existing = null
    } else if (isSoloOrg) {
      const impact = await getOrgDetachmentImpact(existing.org_id)
      return NextResponse.json(
        {
          error: `You're the only member of "${currentOrgName}"`,
          reason: "solo_org_conflict",
          currentOrgName,
          // Detached rows become unreachable by every advertiser, so the
          // confirmation copy has to name what is lost.
          campaignCount: impact.campaignCount,
          supportCaseCount: impact.supportCaseCount,
        },
        { status: 409 },
      )
    } else {
      const guidance = existing.is_owner
        ? `You're the admin of "${currentOrgName}" (${memberCount} members) — transfer admin to someone else in Team settings before joining a different organization.`
        : `You're already part of "${currentOrgName}" (${memberCount} members) — leave it from Settings before joining a different organization.`
      return jsonError(guidance, 409)
    }
  }
  if (existing?.removed_at && existing.org_id !== invitation.org_id) {
    return jsonError("already belongs to an organization", 409)
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

  const org = await toOrgDto(member.org_id, auth.access.userId)

  return NextResponse.json({
    orgId: member.org_id,
    memberId: member.id,
    roleId: member.role_id,
    roleName: member.role?.name ?? null,
    org,
  })
}
