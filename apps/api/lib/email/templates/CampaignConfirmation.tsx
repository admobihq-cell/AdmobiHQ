import * as React from "react"
import { Button, Hr, Link, Section, Text } from "react-email"

import { EmailLayout, EmailList, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface CampaignConfirmationProps {
  name: string
  company: string
}

export const CampaignConfirmation = ({ name, company }: CampaignConfirmationProps) => (
  <EmailLayout preview="Your campaign brief is with the Admobi team">
    <Text style={emailStyles.heading}>Campaign brief received</Text>

    <Text style={emailStyles.paragraph}>Hi {name},</Text>

    <Text style={emailStyles.paragraph}>
      We have your brief for <strong>{company}</strong>. A member of the Admobi
      team will reply within one business day with availability, pricing, and a
      proposed flight plan.
    </Text>

    <Text style={emailStyles.label}>What we will cover</Text>
    <EmailList
      items={[
        "Corridor and city coverage for your dates",
        "Creative format options and lead times",
        "Budget-aligned pricing with delivery reporting",
        "Terms suited to short tests or longer flights",
      ]}
    />

    <Section style={emailStyles.buttonWrap}>
      <Button style={emailStyles.button} href="https://admobihq.com/start-campaign">
        Review campaign options
      </Button>
    </Section>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>
      If anything in your brief has changed, reply to this email and we will
      update the file before we call.
    </Text>

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
