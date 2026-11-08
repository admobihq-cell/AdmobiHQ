import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface MoneyUpdateProps {
  title: string
  body: string
  cta?: { label: string; href: string }
}

/** Generic money notice: refunds to advertisers, payout-detail changes to
 * drivers, and the body of ops finance alerts. */
export const MoneyUpdate = ({ title, body, cta }: MoneyUpdateProps) => (
  <EmailLayout preview={title}>
    <Text style={emailStyles.heading}>{title}</Text>

    <Text style={emailStyles.paragraph}>{body}</Text>

    {cta ? (
      <Section style={emailStyles.buttonWrap}>
        <Button style={emailStyles.button} href={cta.href}>
          {cta.label}
        </Button>
      </Section>
    ) : null}

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
