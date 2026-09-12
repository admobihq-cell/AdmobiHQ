import { NextResponse } from "next/server"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { toCampaignDto } from "@/lib/campaign-dto"
import {
  EDITABLE_STATUSES,
  getOwnedCampaign,
  missingCampaignCreatives,
  missingCampaignFields,
} from "@/lib/campaign-store"
import { getCustomerEmail, getCustomerName } from "@/lib/customer-clerk"
import { renderTemplate } from "@/lib/email/render-template"
import { sendAdminEmail, sendEmail } from "@/lib/email/send-email"
import { AdminAlert, reviewUrl } from "@/lib/email/templates/AdminAlert"
import { CampaignSubmitted } from "@/lib/email/templates/CampaignSubmitted"
import { prisma } from "@/lib/prisma"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"
import { notifyUserPush } from "@/lib/push/user-push"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("campaigns:submit")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Campaign can't be submitted while status is "${campaign.status}"`, 409)
  }

  const missingFields = missingCampaignFields(campaign)
  const missingCreatives = missingCampaignCreatives(campaign.format, campaign.creatives)
  if (missingFields.length > 0 || missingCreatives.length > 0) {
    return jsonError("Campaign is incomplete", 400, { missingFields, missingCreatives })
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      // Clear the previous decision note: it described the version being
      // replaced, and leaving it would show a stale rejection reason on a
      // campaign that is now awaiting review.
      review_reason: null,
    },
    include: { creatives: { orderBy: { created_at: "asc" } } },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "campaign",
    entity_id: id,
    summary: `Campaign #${id} "${updated.name}" submitted for review`,
  })

  // Notify the advertiser + ops (fire-and-forget, never blocks the response).
  // The write above is already committed; a dead Expo token or a Resend
  // hiccup must not turn a successful submission into a 500.
  try {
    const contactEmail = updated.contact_email ?? (await getCustomerEmail(auth.access.userId))
    const name = updated.contact_name ?? (await getCustomerName(auth.access.userId)) ?? "there"

    await prisma.customerNotification.create({
      data: {
        clerk_user_id: auth.access.userId,
        type: "campaign_submitted",
        title: "Campaign submitted",
        body: `We're reviewing "${updated.name}" — this usually takes a day or two.`,
        href: `/campaigns/${id}`,
      },
    })

    await notifyUserPush("customer", auth.access.userId, {
      title: "Campaign submitted",
      body: `We're reviewing "${updated.name}".`,
      href: `/campaigns/${id}`,
    })

    if (contactEmail) {
      const html = await renderTemplate(CampaignSubmitted, { name, campaignName: updated.name })
      await sendEmail(contactEmail, "We got your Admobi campaign", html)
    }

    const adminHtml = await renderTemplate(AdminAlert, {
      type: "campaign-submission",
      submitterName: name,
      submitterEmail: contactEmail || "No email on file",
      submitterPhone: updated.contact_phone || undefined,
      submitterCity: updated.market || undefined,
      additionalInfo: `Campaign #${id} — ${updated.format}, budget KES ${updated.budget_kes?.toString() ?? "—"}`,
      reviewUrl: reviewUrl(`/campaigns/${id}`),
    })
    await sendAdminEmail(`Campaign ready for review: ${updated.name}`, adminHtml)

    await notifyOpsStaffAlert({
      type: "campaign_submission",
      entityId: id,
      submitterName: updated.name,
      submitterCompany: name,
    })
  } catch (error) {
    console.error("[customer/campaigns/submit] Failed to send notifications:", error)
  }

  return NextResponse.json(toCampaignDto(updated))
}
