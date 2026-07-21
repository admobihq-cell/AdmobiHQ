import * as React from "react"
import { Hr, Link, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface AdminAlertProps {
  type: "campaign" | "fleet" | "driver"
  submitterName: string
  submitterEmail: string
  submitterPhone?: string
  submitterCompany?: string
  submitterCity?: string
  additionalInfo?: string
}

const typeLabels = {
  campaign: "Campaign brief",
  fleet: "Fleet partnership",
  driver: "Driver application",
} as const

export const AdminAlert = ({
  type,
  submitterName,
  submitterEmail,
  submitterPhone,
  submitterCompany,
  submitterCity,
  additionalInfo,
}: AdminAlertProps) => {
  const submittedAt = new Date().toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <EmailLayout preview={`New ${typeLabels[type].toLowerCase()} on Admobi`}>
      <Text style={emailStyles.heading}>New {typeLabels[type]}</Text>

      <Text style={emailStyles.paragraph}>
        A new submission arrived on the marketing site. Full record is in the ops
        database.
      </Text>

      <Text style={emailStyles.label}>Name</Text>
      <Text style={emailStyles.value}>{submitterName}</Text>

      <Text style={emailStyles.label}>Email</Text>
      <Text style={emailStyles.value}>
        <Link href={`mailto:${submitterEmail}`} style={emailStyles.link}>
          {submitterEmail}
        </Link>
      </Text>

      {submitterPhone ? (
        <>
          <Text style={emailStyles.label}>Phone</Text>
          <Text style={emailStyles.value}>{submitterPhone}</Text>
        </>
      ) : null}

      {submitterCompany ? (
        <>
          <Text style={emailStyles.label}>Company</Text>
          <Text style={emailStyles.value}>{submitterCompany}</Text>
        </>
      ) : null}

      {submitterCity ? (
        <>
          <Text style={emailStyles.label}>City</Text>
          <Text style={emailStyles.value}>{submitterCity}</Text>
        </>
      ) : null}

      {additionalInfo ? (
        <>
          <Text style={emailStyles.label}>Notes</Text>
          <Text style={emailStyles.value}>{additionalInfo}</Text>
        </>
      ) : null}

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.label}>Submitted</Text>
      <Text style={emailStyles.value}>{submittedAt} EAT</Text>

      <Text style={emailStyles.meta}>
        Internal alert from admobihq.com forms. No reply required.
      </Text>
    </EmailLayout>
  )
}
