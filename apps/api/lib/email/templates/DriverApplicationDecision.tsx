import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

export type DriverApplicationDecisionKind =
  | "approved"
  | "rejected"
  | "changes_requested"

interface DriverApplicationDecisionProps {
  name: string
  decision: DriverApplicationDecisionKind
  reason?: string | null
}

const COPY: Record<
  DriverApplicationDecisionKind,
  { preview: string; heading: string; body: string; reasonLabel: string }
> = {
  approved: {
    preview: "Your Admobi driver application was approved",
    heading: "You're verified",
    body: "Good news — your driver application has been approved. You now have full access to routes, deliveries, and payouts in the app.",
    reasonLabel: "Notes",
  },
  rejected: {
    preview: "Your Admobi driver application needs attention",
    heading: "Your application was not approved",
    body: "We've reviewed your application and can't approve it as submitted. See the reason below.",
    reasonLabel: "Why it was rejected",
  },
  changes_requested: {
    preview: "Your Admobi driver application needs a few changes",
    heading: "A few changes are needed",
    body: "We've reviewed your application and need a few changes before we can approve it. See what to update below.",
    reasonLabel: "What needs to change",
  },
}

export const DriverApplicationDecision = ({
  name,
  decision,
  reason,
}: DriverApplicationDecisionProps) => {
  const copy = COPY[decision]

  return (
    <EmailLayout preview={copy.preview}>
      <Text style={emailStyles.heading}>{copy.heading}</Text>

      <Text style={emailStyles.paragraph}>Hi {name},</Text>

      <Text style={emailStyles.paragraph}>{copy.body}</Text>

      {reason ? (
        <>
          <Text style={emailStyles.label}>{copy.reasonLabel}</Text>
          <Text style={emailStyles.value}>{reason}</Text>
        </>
      ) : null}

      <Section style={emailStyles.buttonWrap}>
        <Button style={emailStyles.button} href="https://driver.admobihq.com/settings/account">
          {decision === "approved" ? "Open the app" : "Update your application"}
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
    </EmailLayout>
  )
}
