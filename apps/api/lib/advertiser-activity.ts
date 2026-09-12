import type { Prisma } from "@prisma/client"
import type { AdvertiserActivityItemDto } from "@workspace/ops-contracts"

import { getCustomerEmail, getCustomerName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"

type AllowTriple = { actor_type: string; action: string; entity_type: string }

/** Fail-closed allowlist — new audit actions stay invisible until added here. */
export const ADVERTISER_ACTIVITY_ALLOWLIST: readonly AllowTriple[] = [
  { actor_type: "customer", action: "create", entity_type: "campaign" },
  { actor_type: "customer", action: "update", entity_type: "campaign" },
  { actor_type: "customer", action: "delete", entity_type: "campaign" },
  { actor_type: "ops_user", action: "update", entity_type: "campaign" },
  { actor_type: "customer", action: "create", entity_type: "campaign_creative" },
  { actor_type: "customer", action: "delete", entity_type: "campaign_creative" },
  { actor_type: "customer", action: "create", entity_type: "advertiser_invitation" },
  { actor_type: "customer", action: "delete", entity_type: "advertiser_invitation" },
  { actor_type: "customer", action: "update", entity_type: "advertiser_invitation" },
  { actor_type: "customer", action: "update", entity_type: "advertiser_member" },
  { actor_type: "customer", action: "delete", entity_type: "advertiser_member" },
  { actor_type: "customer", action: "update", entity_type: "advertiser_org" },
  { actor_type: "customer", action: "create", entity_type: "advertiser_role" },
  { actor_type: "customer", action: "update", entity_type: "advertiser_role" },
  { actor_type: "customer", action: "delete", entity_type: "advertiser_role" },
]

export function isAdvertiserVisibleActivity(row: AllowTriple): boolean {
  return ADVERTISER_ACTIVITY_ALLOWLIST.some(
    (t) =>
      t.actor_type === row.actor_type &&
      t.action === row.action &&
      t.entity_type === row.entity_type,
  )
}

export function advertiserActivityWhere(orgId: number): Prisma.AuditEventWhereInput {
  return {
    org_id: orgId,
    OR: ADVERTISER_ACTIVITY_ALLOWLIST.map((t) => ({
      actor_type: t.actor_type,
      action: t.action,
      entity_type: t.entity_type,
    })),
  }
}

export type ActivityCursor = { createdAt: string; id: number }

export function encodeActivityCursor(createdAt: Date, id: number): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id }), "utf8").toString(
    "base64url",
  )
}

export function decodeActivityCursor(raw: string): ActivityCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as ActivityCursor
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "number") return null
    return parsed
  } catch {
    return null
  }
}

function baseLabel(action: string, entityType: string): string {
  const key = `${action}:${entityType}`
  switch (key) {
    case "create:campaign":
      return "Campaign created"
    case "update:campaign":
      return "Campaign updated"
    case "delete:campaign":
      return "Campaign deleted"
    case "create:campaign_creative":
      return "Creative uploaded"
    case "delete:campaign_creative":
      return "Creative removed"
    case "create:advertiser_invitation":
      return "Teammate invited"
    case "delete:advertiser_invitation":
      return "Invitation revoked"
    case "update:advertiser_invitation":
      return "Invitation accepted"
    case "update:advertiser_member":
      return "Member role changed"
    case "delete:advertiser_member":
      return "Member removed"
    case "update:advertiser_org":
      return "Organization renamed"
    case "create:advertiser_role":
      return "Role created"
    case "update:advertiser_role":
      return "Role updated"
    case "delete:advertiser_role":
      return "Role deleted"
    default:
      return "Activity"
  }
}

export async function toAdvertiserActivityItem(row: {
  id: number
  actor_type: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  created_at: Date
}): Promise<AdvertiserActivityItemDto> {
  let label = baseLabel(row.action, row.entity_type)
  let detail: string | null = null

  if (row.actor_type === "ops_user" && row.entity_type === "campaign" && row.action === "update") {
    label = "Campaign reviewed"
    const campaignId = row.entity_id ? Number(row.entity_id) : NaN
    if (Number.isFinite(campaignId)) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { review_reason: true, status: true, name: true },
      })
      if (campaign) {
        detail = campaign.review_reason?.trim()
          ? campaign.review_reason
          : `Status: ${campaign.status.replace(/_/g, " ")}`
        if (campaign.name) label = `Campaign "${campaign.name}" reviewed`
      }
    }
  } else if (row.entity_type === "campaign" && row.entity_id) {
    const campaignId = Number(row.entity_id)
    if (Number.isFinite(campaignId)) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { name: true, status: true },
      })
      if (campaign?.name) {
        if (row.action === "update" && campaign.status === "in_review") {
          label = `Campaign "${campaign.name}" submitted`
        } else {
          label = `${baseLabel(row.action, row.entity_type).replace("Campaign", `Campaign "${campaign.name}"`)}`
        }
      }
    }
  }

  let actorLabel = "Someone"
  if (row.actor_type === "ops_user") {
    actorLabel = "Admobi review team"
  } else if (row.actor_user_id) {
    const [name, email] = await Promise.all([
      getCustomerName(row.actor_user_id),
      getCustomerEmail(row.actor_user_id),
    ])
    actorLabel = name ?? email ?? "Teammate"
  }

  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    label,
    detail,
    actorLabel,
    entityType: row.entity_type,
    action: row.action,
  }
}
