import { NextResponse } from "next/server"

import type { OpsAdvertiserOrgDetailDto } from "@workspace/ops-contracts"

import {
  toInvitationDto,
  toMemberDto,
} from "@/lib/advertiser-org"
import {
  advertiserActivityWhere,
  toAdvertiserActivityItem,
} from "@/lib/advertiser-activity"
import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

const ACTIVITY_LIMIT = 30
const CAMPAIGN_LIMIT = 50

/** Ops org detail: members, pending invites, campaigns, projected activity. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (id == null) return jsonError("Invalid organization id", 400)

  const org = await prisma.advertiserOrg.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          members: { where: { removed_at: null } },
          campaigns: true,
        },
      },
    },
  })
  if (!org) return jsonError("Organization not found", 404)

  const [members, inviteRows, campaigns, activityRows] = await Promise.all([
    prisma.advertiserMember.findMany({
      where: { org_id: id, removed_at: null },
      include: { role: true },
      orderBy: [{ is_owner: "desc" }, { created_at: "asc" }],
    }),
    prisma.advertiserInvitation.findMany({
      where: {
        org_id: id,
        accepted_at: null,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.campaign.findMany({
      where: { org_id: id },
      orderBy: { created_at: "desc" },
      take: CAMPAIGN_LIMIT,
      select: {
        id: true,
        name: true,
        status: true,
        submitted_at: true,
        contact_email: true,
      },
    }),
    prisma.auditEvent.findMany({
      where: advertiserActivityWhere(id),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        actor_type: true,
        actor_user_id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        created_at: true,
      },
    }),
  ])

  const roleIds = [
    ...new Set(inviteRows.map((i) => i.role_id).filter((id): id is number => id != null)),
  ]
  const roles = roleIds.length
    ? await prisma.advertiserRole.findMany({ where: { id: { in: roleIds } } })
    : []
  const roleNameById = new Map(roles.map((r) => [r.id, r.name]))

  const body: OpsAdvertiserOrgDetailDto = {
    id: org.id,
    name: org.name,
    createdAt: org.created_at.toISOString(),
    updatedAt: org.updated_at.toISOString(),
    memberCount: org._count.members,
    campaignCount: org._count.campaigns,
    members: await Promise.all(members.map((m) => toMemberDto(m))),
    invitations: inviteRows.map((row) =>
      toInvitationDto({
        ...row,
        role: row.role_id != null ? { name: roleNameById.get(row.role_id) ?? "Unknown" } : null,
      }),
    ),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      submittedAt: c.submitted_at?.toISOString() ?? null,
      contactEmail: c.contact_email,
    })),
    activity: await Promise.all(activityRows.map((row) => toAdvertiserActivityItem(row))),
  }

  return NextResponse.json(body)
}
