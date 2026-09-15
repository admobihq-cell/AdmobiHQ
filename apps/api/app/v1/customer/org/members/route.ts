import { NextResponse } from "next/server"

import { advertiserInviteSchema } from "@workspace/ops-contracts"

import {
  INVITE_TTL_MS,
  findClerkUserIdByEmail,
  getAssignableRole,
  resolveInviterLabel,
  toInvitationDto,
  toMemberDtos,
} from "@/lib/advertiser-org"
import {
  generateAdvertiserInviteToken,
  hashAdvertiserInviteToken,
} from "@/lib/advertiser-invite-token"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendEmail } from "@/lib/email/send-email"
import { renderTemplate } from "@/lib/email/render-template"
import {
  AdvertiserOrgInvite,
  advertiserInviteAcceptUrl,
} from "@/lib/email/templates/AdvertiserOrgInvite"
import { prisma } from "@/lib/prisma"

/** Bounds the roster payload. v1 allows one org per user, so real orgs are far
 * smaller than this — the cap only stops a pathological row count. */
const MAX_ROSTER_ROWS = 200

export async function GET() {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error

  const [members, inviteRows] = await Promise.all([
    prisma.advertiserMember.findMany({
      where: { org_id: auth.access.orgId, removed_at: null },
      include: { role: true },
      orderBy: [{ is_owner: "desc" }, { created_at: "asc" }],
      take: MAX_ROSTER_ROWS,
    }),
    prisma.advertiserInvitation.findMany({
      where: {
        org_id: auth.access.orgId,
        accepted_at: null,
        revoked_at: null,
        // Declined rows are returned regardless of expiry: an admin needs to
        // see that someone said no, not watch the invite silently vanish.
        OR: [{ declined_at: { not: null } }, { expires_at: { gt: new Date() } }],
      },
      orderBy: { created_at: "desc" },
      take: MAX_ROSTER_ROWS,
    }),
  ])

  const roleIds = [
    ...new Set(inviteRows.map((i) => i.role_id).filter((id): id is number => id != null)),
  ]
  const roles = roleIds.length
    ? await prisma.advertiserRole.findMany({ where: { id: { in: roleIds } } })
    : []
  const roleNameById = new Map(roles.map((r) => [r.id, r.name]))

  const membersDto = await toMemberDtos(members)

  return NextResponse.json({
    members: membersDto,
    invitations: inviteRows.map((row) =>
      toInvitationDto({
        ...row,
        role: row.role_id != null ? { name: roleNameById.get(row.role_id) ?? "Unknown" } : null,
      }),
    ),
  })
}

export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error

  // This route sends mail from the Admobi domain on every call, so it is
  // throttled per inviter — an unbounded loop here is an outbound-spam vector
  // that costs deliverability, not just compute.
  const limited = await checkRateLimit(req, "advertiser-invite", {
    limit: 10,
    windowSeconds: 600,
    identifier: auth.access.userId,
  })
  if (limited) return limited

  const parsed = await parseJsonBody(req, advertiserInviteSchema)
  if ("error" in parsed) return parsed.error

  const email = parsed.data.email.toLowerCase()
  const role = await getAssignableRole(auth.access.orgId, parsed.data.roleId)
  if (!role) return jsonError("Unknown role", 400)

  // Without this, re-inviting a current member creates an invitation that can
  // never be accepted — and a sole owner inviting their own address could
  // confirm "leave and join", detaching every campaign to join the org the
  // invite points at, which was just deleted.
  const existingClerkUserId = await findClerkUserIdByEmail(email)
  if (existingClerkUserId) {
    const activeMember = await prisma.advertiserMember.findFirst({
      where: {
        org_id: auth.access.orgId,
        clerk_user_id: existingClerkUserId,
        removed_at: null,
      },
    })
    if (activeMember) {
      return jsonError(
        activeMember.clerk_user_id === auth.access.userId
          ? "You're already a member of this organization"
          : "That person is already a member of this organization",
        409,
      )
    }
  }

  const token = generateAdvertiserInviteToken()
  const tokenHash = hashAdvertiserInviteToken(token)
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const existing = await prisma.advertiserInvitation.findUnique({
    where: { org_id_email: { org_id: auth.access.orgId, email } },
  })

  let invitation
  if (existing && !existing.accepted_at) {
    invitation = await prisma.advertiserInvitation.update({
      where: { id: existing.id },
      data: {
        role_id: role.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        revoked_at: null,
        accepted_at: null,
        // Clearing this matters: a re-invite after a decline is a fresh offer,
        // and accept refuses any row with declined_at set.
        declined_at: null,
        invited_by_clerk_user_id: auth.access.userId,
      },
    })
  } else if (existing?.accepted_at) {
    return jsonError("That email already accepted an invitation to this organization", 409)
  } else {
    invitation = await prisma.advertiserInvitation.create({
      data: {
        org_id: auth.access.orgId,
        email,
        role_id: role.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        invited_by_clerk_user_id: auth.access.userId,
      },
    })
  }

  const org = await prisma.advertiserOrg.findUnique({ where: { id: auth.access.orgId } })
  const inviterName = await resolveInviterLabel(auth.access.userId)
  const acceptUrl = advertiserInviteAcceptUrl(token)

  try {
    const html = await renderTemplate(AdvertiserOrgInvite, {
      orgName: org?.name ?? "",
      inviterName,
      acceptUrl,
    })
    await sendEmail(email, `You're invited to ${org?.name || "an organization"} on Admobi`, html)
  } catch (error) {
    console.error("[advertiser-invite] failed to send invite email:", error)
  }

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "advertiser_invitation",
    entity_id: invitation.id,
    summary: `Invited ${email} as ${role.name}`,
  })

  return NextResponse.json(
    toInvitationDto({
      ...invitation,
      role: { name: role.name },
    }),
    { status: 201 },
  )
}
