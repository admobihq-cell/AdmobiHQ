import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface CampaignSubmittedProps {
  name: string
  campaignName: string
}

/** Advertiser app URL for a campaign. Unlike the driver templates, which
 * hardcode driver.admobihq.com, this reads NEXT_PUBLIC_APP_URL so review links
 * in staging point at staging — the same reasoning as reviewUrl() in
 * AdminAlert.tsx. Falls back to the production origin when unset, since an
 * email with no link is worse than one pointing at prod. */
export function campaignUrl(campaignId: number): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.admobihq.com"
  return `${base.replace(/\/$/, "")}/campaigns/${campaignId}`
}

export const CampaignSubmitted = ({ name, campaignName }: CampaignSubmittedProps) => (
  <EmailLayout preview="Your Admobi campaign is under review">
    <Text style={emailStyles.heading}>We got your campaign</Text>

    <Text style={emailStyles.paragraph}>Hi {name},</Text>

    <Text style={emailStyles.paragraph}>
      Thanks for submitting <strong>{campaignName}</strong>. Our team is
      reviewing your brief, flight window, and creative now — this usually takes
      a day or two. We&apos;ll email you as soon as there&apos;s an update.
    </Text>

    <Section style={emailStyles.buttonWrap}>
      <Button style={emailStyles.button} href={process.env.NEXT_PUBLIC_APP_URL ?? "https://app.admobihq.com"}>
        View campaign status
      </Button>
    </Section>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>
      No action is needed from you right now — we&apos;ll reach out if anything
      needs changing before your flight goes live.
    </Text>

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
