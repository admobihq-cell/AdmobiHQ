import * as React from "react"
import { Button, Hr, Link, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

/**
 * The admin alert for a driver SOS. Kept separate from AdminAlert rather than
 * added as another `type`: that template's copy is built around anonymous
 * marketing-site form submissions ("A new submission arrived on the marketing
 * site"), and every field an SOS actually needs — a tappable phone number, a
 * map link, severity — is absent from it. The two would fight.
 */
interface SafetyIncidentAlertProps {
  incidentId: number
  driverName: string
  driverPhone?: string | null
  type: string
  severity: string
  description?: string | null
  /** Google Maps link, or null when the device had no fix. */
  mapsUrl?: string | null
  /** Absolute ops URL — build it with reviewUrl() from AdminAlert.tsx. */
  opsUrl?: string
}

function titleCase(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export const SafetyIncidentAlert = ({
  incidentId,
  driverName,
  driverPhone,
  type,
  severity,
  description,
  mapsUrl,
  opsUrl,
}: SafetyIncidentAlertProps) => {
  const reportedAt = new Date().toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <EmailLayout preview={`SOS #${incidentId} — ${titleCase(type)} reported by ${driverName}`}>
      <Text style={{ ...emailStyles.heading, color: "#dc2626" }}>
        SOS — {titleCase(type)}
      </Text>

      <Text style={emailStyles.paragraph}>
        A driver has reported a safety incident from the Admobi driver app.
        Acknowledge it in ops so they know someone has seen it, then call them.
      </Text>

      <Text style={emailStyles.label}>Driver</Text>
      <Text style={emailStyles.value}>{driverName}</Text>

      {driverPhone ? (
        <>
          <Text style={emailStyles.label}>Phone</Text>
          <Text style={emailStyles.value}>
            <Link href={`tel:${driverPhone}`} style={emailStyles.link}>
              {driverPhone}
            </Link>
          </Text>
        </>
      ) : null}

      <Text style={emailStyles.label}>Severity</Text>
      <Text style={emailStyles.value}>{titleCase(severity)}</Text>

      {description ? (
        <>
          <Text style={emailStyles.label}>What they said</Text>
          <Text style={emailStyles.value}>{description}</Text>
        </>
      ) : null}

      <Text style={emailStyles.label}>Location</Text>
      <Text style={emailStyles.value}>
        {mapsUrl ? (
          <Link href={mapsUrl} style={emailStyles.link}>
            Open in Google Maps
          </Link>
        ) : (
          "Unavailable — the device had no fix when the report was filed."
        )}
      </Text>

      {opsUrl ? (
        <Section style={emailStyles.buttonWrap}>
          <Button style={{ ...emailStyles.button, backgroundColor: "#dc2626" }} href={opsUrl}>
            Respond in ops
          </Button>
        </Section>
      ) : null}

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.label}>Reported</Text>
      <Text style={emailStyles.value}>{reportedAt} EAT</Text>

      <Text style={emailStyles.meta}>
        Internal alert from the Admobi driver app. Admobi is not an emergency
        service — if the driver needs police, ambulance, or fire, they should
        call 999.
      </Text>
    </EmailLayout>
  )
}
