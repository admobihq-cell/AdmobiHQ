import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface DriverApplicationSubmittedProps {
  name: string
}

export const DriverApplicationSubmitted = ({ name }: DriverApplicationSubmittedProps) => (
  <EmailLayout preview="Your Admobi driver application is under review">
    <Text style={emailStyles.heading}>We got your application</Text>

    <Text style={emailStyles.paragraph}>Hi {name},</Text>

    <Text style={emailStyles.paragraph}>
      Thanks for completing your driver profile. Our team is reviewing your
      details and documents now — this usually takes a day or two. We&apos;ll
      email you as soon as there&apos;s an update.
    </Text>

    <Section style={emailStyles.buttonWrap}>
      <Button style={emailStyles.button} href="https://driver.admobihq.com/settings/account">
        View application status
      </Button>
    </Section>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.paragraph}>
      No action is needed from you right now — we&apos;ll reach out if we need
      anything else.
    </Text>

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
