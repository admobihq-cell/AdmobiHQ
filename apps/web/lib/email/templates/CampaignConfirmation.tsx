import * as React from "react"
import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Row, Section, Text } from "react-email"

interface CampaignConfirmationProps {
  name: string
  company: string
  budget?: string
}

export const CampaignConfirmation = ({ name, company, budget }: CampaignConfirmationProps) => (
  <Html>
    <Head />
    <Preview>We've received your campaign brief</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Row>
            <Text style={heading}>We've got your brief.</Text>
          </Row>
          <Hr style={hr} />
          <Text style={paragraph}>
            Hi {name},
          </Text>
          <Text style={paragraph}>
            Thank you for submitting your campaign brief for <strong>{company}</strong>. We're excited to work with you!
          </Text>
          <Text style={paragraph}>
            Someone from the Admobi team will reach out within <strong>24 hours</strong> with availability, pricing, and a customized plan for your campaign.
          </Text>

          <Section style={buttonContainer}>
            <Button
              style={button}
              href="https://admobi.co"
            >
              Visit Our Website
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            <strong>What to expect next:</strong>
          </Text>
          <Text style={bulletPoint}>✓ Campaign strategy review</Text>
          <Text style={bulletPoint}>✓ Pricing breakdown for your budget range</Text>
          <Text style={bulletPoint}>✓ GPS-verified delivery guarantee</Text>
          <Text style={bulletPoint}>✓ No long-term contracts</Text>

          <Hr style={hr} />
          <Text style={footerText}>
            Questions? Reply to this email or visit{" "}
            <Link href="https://admobi.co" style={link}>
              admobi.co
            </Link>
          </Text>
          <Text style={footerText}>
            © 2026 Admobi. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,Cantarell,"Fira Sans","Droid Sans","Source Sans Pro",sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
}

const box = {
  padding: "0 48px",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
}

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
}

const heading = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#1a1a1a",
  margin: "16px 0",
  textAlign: "left" as const,
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#5469d4",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
}

const bulletPoint = {
  color: "#525f7f",
  fontSize: "15px",
  lineHeight: "24px",
  marginLeft: "20px",
}

const footer = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "24px",
}

const footerText = {
  color: "#525f7f",
  fontSize: "12px",
  lineHeight: "20px",
}

const link = {
  color: "#5469d4",
  textDecoration: "underline",
}
