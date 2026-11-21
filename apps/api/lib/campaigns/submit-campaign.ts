import type { Prisma } from "@prisma/client"

import { fanOutCustomerCampaignNotice } from "@/lib/advertiser/advertiser-notify"
import { auditFromCustomerUser } from "@/lib/audit"
import { CREATIVES_INCLUDE } from "@/lib/campaigns/campaign-store"
import { getCustomerEmail, getCustomerName } from "@/lib/customer/customer-clerk"
import { renderTemplate } from "@/lib/email/render-template"
import { sendAdminEmail, sendEmail } from "@/lib/email/send-email"
import { AdminAlert, reviewUrl } from "@/lib/email/templates/AdminAlert"
import { CampaignSubmitted } from "@/lib/email/templates/CampaignSubmitted"
import { prisma } from "@/lib/prisma"
import { liveChannel, publishLive } from "@/lib/realtime"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"

type Db = Prisma.TransactionClient | typeof prisma

export type SubmittedCampaign = Prisma.CampaignGetPayload<{ include: typeof CREATIVES_INCLUDE }>

/** The DB half of a submission. Run it in the same transaction that funds the
 * campaign, so a funded campaign can never be left sitting in draft (spec §5.1). */
export function markCampaignSubmitted(db: Db, campaignId: number): Promise<SubmittedCampaign> {
  return db.campaign.update({
    where: { id: campaignId },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      // Clear the previous decision note: it described the version being
      // replaced, and leaving it would show a stale rejection reason on a
      // campaign that is now awaiting review.
      review_reason: null,
    },
    include: CREATIVES_INCLUDE,
  })
}

/** Audit + advertiser/ops notices, after commit. Never throws: the submission
 * is already committed, and a dead Expo token or a Resend hiccup must not turn
 * it into a 500. */
export async function announceCampaignSubmitted(
  campaign: SubmittedCampaign,
  actor: { userId: string },
): Promise<void> {
  const id = campaign.id
  try {
    await auditFromCustomerUser(actor.userId, {
      action: "update",
      entity_type: "campaign",
      entity_id: id,
      summary: `Campaign #${id} "${campaign.name}" submitted for review`,
    })
  } catch (error) {
    console.error("[submit-campaign] Failed to write audit event:", error)
  }

  try {
    const contactEmail = campaign.contact_email ?? (await getCustomerEmail(actor.userId))
    const name = campaign.contact_name ?? (await getCustomerName(actor.userId)) ?? "there"
    const budget = campaign.budget_kes?.toString() ?? "—"

    await fanOutCustomerCampaignNotice({
      orgId: campaign.org_id,
      fallbackUserId: actor.userId,
      type: "campaign_submitted",
      title: "Campaign submitted",
      body: `We're reviewing "${campaign.name}" — this usually takes a day or two.`,
      href: `/campaigns/${id}`,
      actorUserId: actor.userId,
    })
    await publishLive([liveChannel.ops], { topic: "review-queue", id, actor: actor.userId })

    if (contactEmail) {
      const html = await renderTemplate(CampaignSubmitted, { name, campaignName: campaign.name })
      await sendEmail(contactEmail, "We got your Admobi campaign", html)
    }

    const adminHtml = await renderTemplate(AdminAlert, {
      type: "campaign-submission",
      submitterName: name,
      submitterEmail: contactEmail || "No email on file",
      submitterPhone: campaign.contact_phone || undefined,
      submitterCity: campaign.market || undefined,
      additionalInfo: `Campaign #${id} — ${campaign.format}, budget KES ${budget}`,
      reviewUrl: reviewUrl(`/campaigns/${id}`),
    })
    await sendAdminEmail(`Campaign ready for review: ${campaign.name}`, adminHtml)

    await notifyOpsStaffAlert({
      type: "campaign_submission",
      entityId: id,
      submitterName: campaign.name,
      submitterCompany: campaign.funded_at ? `${name} · Funded KES ${budget}` : name,
    })
  } catch (error) {
    console.error("[submit-campaign] Failed to send notifications:", error)
  }
}

/** Submit outside any caller transaction: mark, then announce. */
export async function submitCampaign(campaignId: number, actor: { userId: string }): Promise<SubmittedCampaign> {
  const campaign = await markCampaignSubmitted(prisma, campaignId)
  await announceCampaignSubmitted(campaign, actor)
  return campaign
}
