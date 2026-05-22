import * as React from "react"
import { Body, Button, Container, Head, Hr, Html, Link, Preview, Row, Section, Text } from "react-email"

interface FleetPartnerConfirmationProps {
  name: string
  company: string
}

export const FleetPartnerConfirmation = ({ name, company }: FleetPartnerConfirmationProps) => (
  <Html>
    <Head />
    <Preview>We've received your fleet partnership application</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Row>
            <Text style={heading}>We've got your application.</Text>
          </Row>
          <Hr style={hr} />
          <Text style={paragraph}>
            Hi {name},
          </Text>
          <Text style={paragraph}>
            Thank you for applying to become an Admobi fleet partner. We're impressed with <strong>{company}</strong> and excited about the possibility of working together!
          </Text>
          <Text style={paragraph}>
            Our partnerships team will review your application and reach out within <strong>24-48 hours</strong> to discuss:
          </Text>

          <Section style={bulletContainer}>
            <Text style={bulletPoint}>✓ Revenue sharing opportunities</Text>
            <Text style={bulletPoint}>✓ Integration requirements</Text>
            <Text style={bulletPoint}>✓ Onboarding timeline</Text>
            <Text style={bulletPoint}>✓ Support and training</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button
              style={button}
              href="https://admobi.co"
            >
              Learn More About Our Partnership
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            <strong>Partnership Benefits:</strong>
          </Text>
          <Text style={bulletPoint}>Monetize your existing fleet infrastructure</Text>
          <Text style={bulletPoint}>GPS-verified, transparent reporting</Text>
          <Text style={bulletPoint}>Dedicated partnership support</Text>
          <Text style={bulletPoint}>Flexible terms designed for growth</Text>

          <Hr style={hr} />
          <Text style={paragraph}>
            Questions? Contact our partnerships team at{" "}
            <Link href="mailto:admobihq@gmail.com" style={link}>
              admobihq@gmail.com
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

const bulletContainer = {
  margin: "16px 0",
}

const bulletPoint = {
  color: "#525f7f",
  fontSize: "15px",
  lineHeight: "24px",
  marginLeft: "20px",
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
