import { NextResponse } from "next/server"

import { campaignReviewSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { toCampaignDto } from "@/lib/campaign-dto"
import { getCustomerCompanyName, getCustomerEmail, getCustomerName } from "@/lib/customer-clerk"
import { renderTemplate } from "@/lib/email/render-template"
import { sendEmail } from "@/lib/email/send-email"
import {
  CampaignDecision,
  type CampaignDecisionKind,
} from "@/lib/email/templates/CampaignDecision"
import { prisma } from "@/lib/prisma"
import { notifyUserPush } from "@/lib/push/user-push"

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

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error
  const { access } = auth

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, campaignReviewSchema)
  if ("error" in parsed) return parsed.error
  const { decision, reason } = parsed.data

  const existing = await prisma.campaign.findUnique({ where: { id } })
  if (!existing) return jsonError("Not found", 404)

  // Normal review happens from "submitted". An already-"approved" campaign can
  // only be walked back ("unapprove") — never re-approved through this same
  // no-op path — which is why decision must differ from the current status
  // there. Mirrors the driver-application review route.
  const isUnapprove = existing.status === "approved" && decision !== "approved"
  if (existing.status !== "submitted" && !isUnapprove) {
    return jsonError(`Campaign can't be reviewed while status is "${existing.status}"`, 409)
  }
  if (decision !== "approved" && !reason) {
    return jsonError("A reason is required to reject or request changes", 400)
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      status: decision,
      reviewed_at: new Date(),
      reviewed_by_email: access.email,
      review_reason: decision === "approved" ? null : (reason ?? null),
    },
    include: { creatives: { orderBy: { created_at: "asc" } } },
  })

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "campaign",
    entity_id: id,
    summary: isUnapprove
      ? `Campaign #${id} "${updated.name}" unapproved (now ${decision.replace(/_/g, " ")})`
      : `Campaign #${id} "${updated.name}" ${decision.replace(/_/g, " ")}`,
  })

  // Notify the advertiser (fire-and-forget, never blocks the response).
  try {
    const copy = NOTIFICATION_COPY[decision]
    const body = copy.body(updated.name, updated.review_reason)

    await prisma.customerNotification.create({
      data: {
        clerk_user_id: updated.clerk_user_id,
        type: copy.type,
        title: copy.title,
        body,
        href: `/campaigns/${id}`,
      },
    })

    await notifyUserPush("customer", updated.clerk_user_id, {
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

  return NextResponse.json(
    toCampaignDto(updated, undefined, await getCustomerCompanyName(updated.clerk_user_id)),
  )
}
