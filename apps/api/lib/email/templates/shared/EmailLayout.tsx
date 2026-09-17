import * as React from "react"
import {
  Body,
  Container,
  Head,
  Html,
  Img,
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
            <Link href="https://admobihq.com" style={{ textDecoration: "none" }}>
              <table
                role="presentation"
                align="center"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                style={{ margin: "0 auto" }}
              >
                <tbody>
                  <tr>
                    <td style={{ paddingRight: "10px", verticalAlign: "middle" }}>
                      <Img
                        src="https://admobihq.com/brand/logo-mark.png"
                        width={40}
                        height={22}
                        alt=""
                        style={{ display: "block" }}
                      />
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                      <Text style={emailStyles.brand}>Admobi</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Link>
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
