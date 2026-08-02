import * as React from "react"
import { Hr, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface SupportCaseConfirmationProps {
  name: string
  caseId: number
  subject: string
}

export const SupportCaseConfirmation = ({
  name,
  caseId,
  subject,
}: SupportCaseConfirmationProps) => (
  <EmailLayout preview={`We received your support request — case #${caseId}`}>
    <Text style={emailStyles.heading}>We&apos;ve got your request</Text>

    <Text style={emailStyles.paragraph}>Hi {name},</Text>

    <Text style={emailStyles.paragraph}>
      Thanks for reaching out. Your case is open and the Admobi team will
      reply here as soon as they have an update.
    </Text>

    <Text style={emailStyles.label}>Case</Text>
    <Text style={emailStyles.value}>#{caseId} — {subject}</Text>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>
      You can add more detail or check for a reply any time from the Admobi
      app under Settings → Help &amp; contact.
    </Text>

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
