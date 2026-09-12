import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface AdvertiserOrgInviteProps {
  orgName: string
  inviterName: string
  acceptUrl: string
}

export function advertiserInviteAcceptUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.admobihq.com"
  return `${base.replace(/\/$/, "")}/invitations/${encodeURIComponent(token)}`
}

export const AdvertiserOrgInvite = ({
  orgName,
  inviterName,
  acceptUrl,
}: AdvertiserOrgInviteProps) => (
  <EmailLayout preview={`You've been invited to ${orgName} on Admobi`}>
    <Text style={emailStyles.heading}>You&apos;re invited</Text>

    <Text style={emailStyles.paragraph}>
      {inviterName} invited you to join <strong>{orgName || "their organization"}</strong> on
      Admobi — so you can work on campaigns together.
    </Text>

    <Section style={emailStyles.buttonWrap}>
      <Button style={emailStyles.button} href={acceptUrl}>
        Accept invitation
      </Button>
    </Section>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>
      If you weren&apos;t expecting this, you can ignore the email — nothing happens until you
      accept.
    </Text>

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
