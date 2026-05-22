import * as React from "react"
import { Body, Container, Head, Hr, Html, Link, Preview, Row, Section, Text } from "react-email"

interface AdminAlertProps {
  type: "campaign" | "fleet" | "driver"
  submitterName: string
  submitterEmail: string
  submitterPhone?: string
  submitterCompany?: string
  submitterCity?: string
  additionalInfo?: string
}

export const AdminAlert = ({
  type,
  submitterName,
  submitterEmail,
  submitterPhone,
  submitterCompany,
  submitterCity,
  additionalInfo,
}: AdminAlertProps) => {
  const typeLabel = {
    campaign: "Campaign Brief",
    fleet: "Fleet Partnership",
    driver: "Driver Signup",
  }[type]

  return (
    <Html>
      <Head />
      <Preview>New {typeLabel} submission from Admobi</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Row>
              <Text style={heading}>🎯 New {typeLabel} Submission</Text>
            </Row>
            <Hr style={hr} />

            <Text style={label}>Submitter:</Text>
            <Text style={value}>{submitterName}</Text>

            <Text style={label}>Email:</Text>
            <Text style={value}>
              <Link href={`mailto:${submitterEmail}`} style={link}>
                {submitterEmail}
              </Link>
            </Text>

            {submitterPhone && (
              <>
                <Text style={label}>Phone:</Text>
                <Text style={value}>{submitterPhone}</Text>
              </>
            )}

            {submitterCompany && (
              <>
                <Text style={label}>Company:</Text>
                <Text style={value}>{submitterCompany}</Text>
              </>
            )}

            {submitterCity && (
              <>
                <Text style={label}>City:</Text>
                <Text style={value}>{submitterCity}</Text>
              </>
            )}

            {additionalInfo && (
              <>
                <Text style={label}>Details:</Text>
                <Text style={value}>{additionalInfo}</Text>
              </>
            )}

            <Hr style={hr} />
            <Text style={timestamp}>
              Submitted: {new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" })} EAT
            </Text>

            <Hr style={hr} />
            <Text style={footer}>
              This is an automated alert. Check the database for full submission details.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

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

const heading = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#1a1a1a",
  margin: "16px 0",
  textAlign: "left" as const,
}

const label = {
  color: "#525f7f",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "24px",
  textAlign: "left" as const,
  marginTop: "16px",
}

const value = {
  color: "#1a1a1a",
  fontSize: "15px",
  lineHeight: "24px",
  textAlign: "left" as const,
  marginTop: "4px",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
}

const timestamp = {
  color: "#999",
  fontSize: "12px",
  lineHeight: "20px",
  fontStyle: "italic" as const,
}

const footer = {
  color: "#525f7f",
  fontSize: "12px",
  lineHeight: "20px",
}

const link = {
  color: "#5469d4",
  textDecoration: "underline",
}
