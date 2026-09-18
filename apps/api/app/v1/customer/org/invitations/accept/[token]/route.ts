import { NextResponse } from "next/server"

import type { AdvertiserInviteConflict } from "@workspace/ops-contracts"

import { hashAdvertiserInviteToken } from "@/lib/advertiser-invite-token"
import {
  detachAndDeleteOrg,
  getOrgDetachmentImpact,
  isUntouchedSoloOrg,
  resolveInviterLabel,
  toOrgDto,
} from "@/lib/advertiser-org"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, requireCustomerIdentityAccess } from "@/lib/api-utils"
import { getCustomerIdentity, invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { getCustomerEmail } from "@/lib/customer-clerk"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ token: string }> }

/**
 * Nothing here accepts on the caller's behalf. The invitee must see what
 * they're joining — and what it would cost them — then choose. GET is the
 * preview that makes that screen possible; POST acts only on an explicit
 * choice and refuses to replace an existing workspace without
 * `leaveSoleOrg: true`.
 */

async function loadInvitation(rawToken: string) {
  if (!rawToken?.trim()) return null
  return prisma.advertiserInvitation.findUnique({
    where: { token_hash: hashAdvertiserInviteToken(rawToken) },
    include: { org: true },
  })
}

/** role_id has no Prisma relation on AdvertiserInvitation, so it needs its own read. */
async function invitationRoleName(roleId: number | null): Promise<string | null> {
  if (roleId == null) return null
  const role = await prisma.advertiserRole.findUnique({ where: { id: roleId } })
  return role?.name ?? null
}

function invitationGateError(invitation: Awaited<ReturnType<typeof loadInvitation>>) {
  if (!invitation || invitation.revoked_at) return jsonError("Invitation not found", 404)
  if (invitation.accepted_at) return jsonError("Invitation already accepted", 409)
  if (invitation.declined_at) return jsonError("Invitation was declined", 409)
  if (invitation.expires_at.getTime() <= Date.now()) {
    return jsonError("Invitation has expired", 410)
  }
  return null
}

export async function GET(_req: Request, { params }: Params) {
  const invitation = await loadInvitation((await params).token)
  const gate = invitationGateError(invitation)
  if (gate) return gate
  if (!invitation) return jsonError("Invitation not found", 404)

  // Deliberately readable without a session: whoever holds the token can
  // already accept it, so naming the org before sign-up leaks nothing and
  // turns a bare "sign in" wall into an informed decision.
  const userId = await getCustomerIdentity()

  let conflict: AdvertiserInviteConflict | null = null
  let currentOrgName: string | null = null
  let campaignCount = 0
  let supportCaseCount = 0
  let emailMismatch = false

  if (userId) {
    const actorEmail = await getCustomerEmail(userId)
    emailMismatch = !actorEmail || actorEmail.toLowerCase() !== invitation.email.toLowerCase()

    const existing = await prisma.advertiserMember.findUnique({
      where: { clerk_user_id: userId },
    })

    if (!existing || existing.removed_at) {
      conflict = "none"
    } else {
      const [memberCount, org] = await Promise.all([
        prisma.advertiserMember.count({ where: { org_id: existing.org_id, removed_at: null } }),
        prisma.advertiserOrg.findUnique({ where: { id: existing.org_id } }),
      ])
      currentOrgName = org?.name ?? null

      if (!existing.is_owner || memberCount > 1) {
        conflict = "existing_team"
      } else if (await isUntouchedSoloOrg(existing.org_id, existing.is_owner)) {
        conflict = "empty_solo_org"
      } else {
        conflict = "solo_org_with_content"
        const impact = await getOrgDetachmentImpact(existing.org_id)
        campaignCount = impact.campaignCount
        supportCaseCount = impact.supportCaseCount
      }
    }
  }

  return NextResponse.json({
    orgName: invitation.org.name,
    roleName: await invitationRoleName(invitation.role_id),
    inviterName: await resolveInviterLabel(invitation.invited_by_clerk_user_id),
    email: invitation.email,
    expiresAt: invitation.expires_at.toISOString(),
    conflict,
    currentOrgName,
    campaignCount,
    supportCaseCount,
    emailMismatch,
  })
}

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

  // Only the "replace my current workspace" confirmation sends a body. A plain
  // accept falls back to {} and is refused below if the caller already has an
  // org — consent is never inferred from silence.
  const body = (await req.json().catch(() => ({}))) as { leaveSoleOrg?: boolean }
  const leaveSoleOrg = body.leaveSoleOrg === true

  const invitation = await loadInvitation(rawToken)
  const gate = invitationGateError(invitation)
  if (gate) return gate
  if (!invitation) return jsonError("Invitation not found", 404)

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
    const isSoloOrg = existing.is_owner && memberCount === 1

    if (isSoloOrg && leaveSoleOrg) {
      // The caller confirmed this on the preview screen, and it is re-verified
      // here in the same request. Deleting someone's org is never something
      // the server decides on its own.
      await detachAndDeleteOrg(existing.org_id)
      invalidateAdvertiserAccessCache(auth.access.userId)
      existing = null
    } else if (isSoloOrg) {
      const empty = await isUntouchedSoloOrg(existing.org_id, existing.is_owner)
      const impact = empty
        ? { campaignCount: 0, supportCaseCount: 0 }
        : await getOrgDetachmentImpact(existing.org_id)
      return NextResponse.json(
        {
          error: `Accepting replaces "${currentOrgName}"`,
          reason: "solo_org_conflict",
          currentOrgName,
          // An org lazy bootstrap created for them and they never used reads
          // very differently from one holding real work — the client says which.
          soloOrgIsEmpty: empty,
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
