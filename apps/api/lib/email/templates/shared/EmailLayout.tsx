import * as React from "react"
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email"

import { emailStyles } from "@/lib/email/templates/shared/email-theme"

type EmailLayoutProps = {
  preview: string
  children: React.ReactNode
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.header}>
            <Text style={emailStyles.brand}>Admobi</Text>
          </Section>

          <Section style={emailStyles.content}>{children}</Section>

          <Section style={emailStyles.footer}>
            <Text style={emailStyles.footerText}>
              Admobi · LED taxi-top advertising in Kenya
            </Text>
            <Text style={emailStyles.footerText}>
              <Link href="https://admobihq.com" style={emailStyles.link}>
                admobihq.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

type EmailListProps = {
  items: string[]
}

export function EmailList({ items }: EmailListProps) {
  return (
    <Section style={emailStyles.list}>
      {items.map((item, index) => (
        <Text key={`${index}-${item}`} style={emailStyles.listItem}>
          {index + 1}. {item}
        </Text>
      ))}
    </Section>
  )
}

export { emailStyles }
