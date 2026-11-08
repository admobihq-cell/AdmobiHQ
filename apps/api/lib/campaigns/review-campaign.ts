import type { CampaignDto } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import type { requireOpsPermissionAccess } from "@/lib/api-utils"
import { getOrgNameForOrgId } from "@/lib/advertiser/advertiser-org-name"
import { fanOutCustomerCampaignNotice } from "@/lib/advertiser/advertiser-notify"
import { toCampaignDto } from "@/lib/campaigns/campaign-dto"
import { CREATIVES_INCLUDE } from "@/lib/campaigns/campaign-store"
import { getCustomerEmail, getCustomerName } from "@/lib/customer/customer-clerk"
import { renderTemplate } from "@/lib/email/render-template"
import { sendEmail } from "@/lib/email/send-email"
import {
  CampaignDecision,
  type CampaignDecisionKind,
} from "@/lib/email/templates/CampaignDecision"
import { unspentBudgetKes } from "@/lib/payments/funding"
import { notifyCreditReleased } from "@/lib/payments/money-notify"
import { prisma } from "@/lib/prisma"

export type OpsAccess = NonNullable<
  Awaited<ReturnType<typeof requireOpsPermissionAccess>>["access"]
>

export type ReviewOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 404 | 409; error: string }

const NOTIFICATION_COPY: Record<
  CampaignDecisionKind,
  { type: string; title: string; body: (campaignName: string, reason?: string | null) => string }
> = {
  approved: {
    type: "campaign_approved",
    title: "Campaign approved",
    body: (name) => `"${name}" is approved and booked for its flight window.`,
  },
  rejected: {
    type: "campaign_rejected",
    title: "Campaign not approved",
    body: (name, reason) => reason || `"${name}" needs changes before it can be approved.`,
  },
  changes_requested: {
    type: "campaign_changes_requested",
    title: "Changes needed",
    body: (name, reason) => reason || `We requested changes before "${name}" can be approved.`,
  },
}

/** One ops review decision on one campaign — status rules, audit row,
 * advertiser inbox + email, and credit release on reject. The single and
 * bulk review routes both go through here so they can't drift apart.
 *
 * `allowUnapprove: false` (bulk) refuses to walk back an approved campaign;
 * only "submitted" campaigns are reviewable then. */
export async function reviewCampaign(
  access: OpsAccess,
  id: number,
  input: { decision: CampaignDecisionKind; reason?: string },
  opts: { allowUnapprove?: boolean } = {},
): Promise<ReviewOutcome<CampaignDto>> {
  const { decision, reason } = input
  const allowUnapprove = opts.allowUnapprove ?? true

  const existing = await prisma.campaign.findUnique({ where: { id } })
  if (!existing) return { ok: false, status: 404, error: "Not found" }

  // Normal review happens from "submitted". An already-"approved" campaign can
  // only be walked back ("unapprove") — never re-approved through this same
  // no-op path — which is why decision must differ from the current status
  // there. Mirrors the driver-application review.
  const isUnapprove = allowUnapprove && existing.status === "approved" && decision !== "approved"
  if (existing.status !== "submitted" && !isUnapprove) {
    return {
      ok: false,
      status: 409,
      error: `Campaign can't be reviewed while status is "${existing.status}"`,
    }
  }
  if (decision !== "approved" && !reason) {
    return { ok: false, status: 400, error: "A reason is required to reject or request changes" }
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      status: decision,
      reviewed_at: new Date(),
      reviewed_by_email: access.email,
      review_reason: decision === "approved" ? null : (reason ?? null),
      // Rejection releases the hold into available credit (spec §5.4);
      // changes_requested keeps the campaign funded.
      ...(decision === "rejected" ? { funded_at: null } : {}),
    },
    include: CREATIVES_INCLUDE,
  })

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "campaign",
    entity_id: id,
    org_id: existing.org_id,
    summary: isUnapprove
      ? `Campaign #${id} "${updated.name}" unapproved (now ${decision.replace(/_/g, " ")})`
      : `Campaign #${id} "${updated.name}" ${decision.replace(/_/g, " ")}`,
  })

  // Notify every active org member with campaigns:read (fire-and-forget).
  try {
    const copy = NOTIFICATION_COPY[decision]
    const body = copy.body(updated.name, updated.review_reason)

    await fanOutCustomerCampaignNotice({
      orgId: updated.org_id,
      fallbackUserId: updated.clerk_user_id,
      type: copy.type,
      title: copy.title,
      body,
      href: `/campaigns/${id}`,
    })

    const contactEmail =
      updated.contact_email ?? (await getCustomerEmail(updated.clerk_user_id))
    if (contactEmail) {
      const html = await renderTemplate(CampaignDecision, {
        name: updated.contact_name ?? (await getCustomerName(updated.clerk_user_id)) ?? "there",
        campaignName: updated.name,
        campaignId: id,
        decision,
        reason: updated.review_reason,
      })
      await sendEmail(contactEmail, copy.title, html)
    }
  } catch (error) {
    console.error("[campaigns/review] Failed to send notifications:", error)
  }

  if (decision === "rejected" && existing.funded_at && updated.org_id != null) {
    const released = await unspentBudgetKes(updated.id, Number(updated.budget_kes ?? 0))
    if (released > 0) {
      await notifyCreditReleased({
        orgId: updated.org_id,
        amountKes: released,
        campaign: { id: updated.id, name: updated.name },
        reason: "rejected",
      })
    }
  }

  return {
    ok: true,
    value: toCampaignDto(updated, undefined, await getOrgNameForOrgId(updated.org_id)),
  }
}
