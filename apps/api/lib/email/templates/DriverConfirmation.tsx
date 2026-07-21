import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { EmailLayout, EmailList, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface DriverConfirmationProps {
  name: string
  city: string
}

export const DriverConfirmation = ({ name, city }: DriverConfirmationProps) => (
  <EmailLayout preview="Your Admobi driver application is under review">
    <Text style={emailStyles.heading}>Driver application received</Text>

    <Text style={emailStyles.paragraph}>Hi {name},</Text>

    <Text style={emailStyles.paragraph}>
      Your application for the Admobi driver programme in <strong>{city}</strong>{" "}
      is in review. We will contact you within one business day with your status
      and the next onboarding steps.
    </Text>

    <Text style={emailStyles.label}>In that follow-up</Text>
    <EmailList
      items={[
        "Application outcome and any documents we still need",
        "Vehicle and insurance requirements for your city",
        "How earnings are calculated and paid",
        "A direct line to driver support",
      ]}
    />

    <Section style={emailStyles.buttonWrap}>
      <Button style={emailStyles.button} href="https://admobihq.com/drivers">
        Driver programme details
      </Button>
    </Section>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>
      Keep this email for reference. If your contact details change before we
      reach you, reply here with the update.
    </Text>

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
