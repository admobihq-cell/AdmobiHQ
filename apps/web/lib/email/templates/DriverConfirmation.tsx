import * as React from "react"
import { Body, Button, Container, Head, Hr, Html, Link, Preview, Row, Section, Text } from "react-email"

interface DriverConfirmationProps {
  name: string
  city: string
}

export const DriverConfirmation = ({ name, city }: DriverConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Admobi driver program</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Row>
            <Text style={heading}>Welcome to Admobi!</Text>
          </Row>
          <Hr style={hr} />
          <Text style={paragraph}>
            Hi {name},
          </Text>
          <Text style={paragraph}>
            Thank you for signing up for the Admobi driver program in <strong>{city}</strong>. We're excited to have you join our growing community!
          </Text>
          <Text style={paragraph}>
            Your application is being reviewed. We'll be in touch within <strong>24 hours</strong> with:
          </Text>

          <Section style={bulletContainer}>
            <Text style={bulletPoint}>✓ Application status</Text>
            <Text style={bulletPoint}>✓ Onboarding instructions</Text>
            <Text style={bulletPoint}>✓ Earnings potential and opportunities</Text>
            <Text style={bulletPoint}>✓ Support contact information</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button
              style={button}
              href="https://admobi.co"
            >
              Visit Admobi
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            <strong>What You Need to Know:</strong>
          </Text>
          <Text style={bulletPoint}>Flexible schedule - work when you want</Text>
          <Text style={bulletPoint}>Transparent earnings - paid weekly</Text>
          <Text style={bulletPoint}>Vehicle requirements - must be operational and insured</Text>
          <Text style={bulletPoint}>Safety first - we prioritize driver and passenger safety</Text>

          <Hr style={hr} />
          <Text style={paragraph}>
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
