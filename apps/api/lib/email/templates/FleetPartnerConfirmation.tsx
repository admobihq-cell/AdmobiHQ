import * as React from "react"
import { Button, Hr, Link, Section, Text } from "react-email"

import { EmailLayout, EmailList, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface FleetPartnerConfirmationProps {
  name: string
  company: string
}

export const FleetPartnerConfirmation = ({
  name,
  company,
}: FleetPartnerConfirmationProps) => (
  <EmailLayout preview="Your fleet partnership application is with Admobi">
    <Text style={emailStyles.heading}>Partnership application received</Text>

    <Text style={emailStyles.paragraph}>Hi {name},</Text>

    <Text style={emailStyles.paragraph}>
      We have your application for <strong>{company}</strong>. Our partnerships
      team will review it and respond within two business days to schedule a
      call.
    </Text>

    <Text style={emailStyles.label}>On the call we will cover</Text>
    <EmailList
      items={[
        "Revenue share and reporting structure",
        "Hardware installation and fleet integration",
        "Onboarding timeline for your operating cities",
        "Training and ongoing partner support",
      ]}
    />

    <Section style={emailStyles.buttonWrap}>
      <Button style={emailStyles.button} href="https://admobihq.com/partner-fleet">
        Fleet partnership overview
      </Button>
    </Section>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>
      Questions before we call? Email{" "}
      <Link href="mailto:admobihq@gmail.com" style={emailStyles.link}>
        admobihq@gmail.com
      </Link>
      .
    </Text>

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
