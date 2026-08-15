import * as React from "react"
import { Button, Hr, Link, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface AdminAlertProps {
  type: "campaign" | "fleet" | "driver" | "driver-application" | "support"
  submitterName: string
  submitterEmail: string
  submitterPhone?: string
  submitterCompany?: string
  submitterCity?: string
  additionalInfo?: string
  /** Absolute URL (base + path) to the record in ops. Emails have no page to
   * resolve a relative path against, so callers must build the full URL —
   * see reviewUrl() below. */
  reviewUrl?: string
}

const typeLabels = {
  campaign: "Campaign brief",
  fleet: "Fleet partnership",
  driver: "Driver lead",
  "driver-application": "Driver application",
  support: "Support case",
} as const

/** "driver" is an anonymous marketing-site lead (the `drivers` table, no
 * account). "driver-application" is an existing driver account submitting
 * their KYC profile + documents for review — it never touched the marketing
 * site, so it needs its own intro copy rather than the generic one below. */
const typeIntros = {
  campaign: "A new submission arrived on the marketing site. Full record is in the ops database.",
  fleet: "A new submission arrived on the marketing site. Full record is in the ops database.",
  driver: "A new submission arrived on the marketing site. Full record is in the ops database.",
  "driver-application":
    "An existing driver has completed their profile and submitted it for identity verification.",
  support: "A new submission arrived on the marketing site. Full record is in the ops database.",
} as const

/** Builds the absolute ops URL for a review link — `NEXT_PUBLIC_OPS_URL` is
 * the ops app's own origin (localhost in dev, the staging/prod ops domain
 * elsewhere), so this resolves correctly in every environment. */
export function reviewUrl(path: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_OPS_URL
  if (!base) return undefined
  return `${base.replace(/\/$/, "")}${path}`
}

export const AdminAlert = ({
  type,
  submitterName,
  submitterEmail,
  submitterPhone,
  submitterCompany,
  submitterCity,
  additionalInfo,
  reviewUrl: reviewHref,
}: AdminAlertProps) => {
  const submittedAt = new Date().toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <EmailLayout preview={`New ${typeLabels[type].toLowerCase()} on Admobi`}>
      <Text style={emailStyles.heading}>New {typeLabels[type]}</Text>

      <Text style={emailStyles.paragraph}>{typeIntros[type]}</Text>

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

      {reviewHref ? (
        <Section style={emailStyles.buttonWrap}>
          <Button style={emailStyles.button} href={reviewHref}>
            Review in ops
          </Button>
        </Section>
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
