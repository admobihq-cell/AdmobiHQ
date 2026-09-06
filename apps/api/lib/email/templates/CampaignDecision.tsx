import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"
import { campaignUrl } from "@/lib/email/templates/CampaignSubmitted"

export type CampaignDecisionKind = "approved" | "rejected" | "changes_requested"

interface CampaignDecisionProps {
  name: string
  campaignName: string
  campaignId: number
  decision: CampaignDecisionKind
  /** Shown verbatim — this is the advertiser-visible review note ops wrote,
   * and paraphrasing it here would leave the email disagreeing with the app. */
  reason?: string | null
}

const COPY: Record<
  CampaignDecisionKind,
  { preview: string; heading: string; body: string; reasonLabel: string; cta: string }
> = {
  approved: {
    preview: "Your Admobi campaign was approved",
    heading: "Your campaign is approved",
    body: "Good news — your campaign has been approved and is booked for its flight window. You'll see it move to live in the app when the first day arrives.",
    reasonLabel: "Notes from the team",
    cta: "View campaign",
  },
  rejected: {
    preview: "Your Admobi campaign needs attention",
    heading: "Your campaign was not approved",
    body: "We've reviewed your campaign and can't approve it as submitted. See the reason below — you can edit and resubmit whenever you're ready.",
    reasonLabel: "Why it wasn't approved",
    cta: "Edit and resubmit",
  },
  changes_requested: {
    preview: "Your Admobi campaign needs a few changes",
    heading: "A few changes are needed",
    body: "We've reviewed your campaign and need a few changes before we can approve it. See what to update below.",
    reasonLabel: "What needs to change",
    cta: "Edit and resubmit",
  },
}

export const CampaignDecision = ({
  name,
  campaignName,
  campaignId,
  decision,
  reason,
}: CampaignDecisionProps) => {
  const copy = COPY[decision]

  return (
    <EmailLayout preview={copy.preview}>
      <Text style={emailStyles.heading}>{copy.heading}</Text>

      <Text style={emailStyles.paragraph}>Hi {name},</Text>

      <Text style={emailStyles.paragraph}>
        {copy.body}
      </Text>

      <Text style={emailStyles.label}>Campaign</Text>
      <Text style={emailStyles.value}>{campaignName}</Text>

      {reason ? (
        <>
          <Text style={emailStyles.label}>{copy.reasonLabel}</Text>
          <Text style={emailStyles.value}>{reason}</Text>
        </>
      ) : null}

      <Section style={emailStyles.buttonWrap}>
        <Button style={emailStyles.button} href={campaignUrl(campaignId)}>
          {copy.cta}
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
    </EmailLayout>
  )
}
