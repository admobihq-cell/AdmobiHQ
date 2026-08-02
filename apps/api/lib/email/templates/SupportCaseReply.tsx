import * as React from "react"
import { Hr, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface SupportCaseReplyProps {
  name: string
  caseId: number
  subject: string
  reply: string
}

export const SupportCaseReply = ({ name, caseId, subject, reply }: SupportCaseReplyProps) => (
  <EmailLayout preview={`New reply on case #${caseId}`}>
    <Text style={emailStyles.heading}>Admobi replied to your case</Text>

    <Text style={emailStyles.paragraph}>Hi {name},</Text>

    <Text style={emailStyles.label}>Case</Text>
    <Text style={emailStyles.value}>#{caseId} — {subject}</Text>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>{reply}</Text>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>
      View the full conversation or reply from the Admobi app under Settings →
      Help &amp; contact.
    </Text>

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
