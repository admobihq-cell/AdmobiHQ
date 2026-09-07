import { NextResponse } from "next/server"

import { formatLabel, safetyIncidentCreateSchema } from "@workspace/ops-contracts"

import { auditFromDriverUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireDriverAccess } from "@/lib/api-utils"
import { reviewUrl } from "@/lib/email/templates/AdminAlert"
import { SafetyIncidentAlert } from "@/lib/email/templates/SafetyIncidentAlert"
import { renderTemplate } from "@/lib/email/render-template"
import { sendAdminEmail } from "@/lib/email/send-email"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { severityForType, toDriverIncident, toOpsIncident } from "@/lib/safety-incident"

/** Google Maps deep link, or null when the device had no fix. */
function mapsUrlFor(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null) return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export async function POST(req: Request) {
  // Tighter than the support form's 5/60s: a genuine emergency is one report,
  // and this endpoint pages every ops device on the account.
  const limited = await checkRateLimit(req, "sos-create", { limit: 3, windowSeconds: 300 })
  if (limited) return limited

  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, safetyIncidentCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = parsed.data

  try {
    // Snapshot name/phone rather than joining at read time — ops needs a number
    // to call in the first thirty seconds, and that must not depend on the
    // profile still existing or holding the same number weeks later.
    const profile = await prisma.driverProfile.findUnique({
      where: { clerk_user_id: auth.access.userId },
      select: { full_name: true, phone: true },
    })

    const incident = await prisma.safetyIncident.create({
      data: {
        driver_clerk_user_id: auth.access.userId,
        driver_name: profile?.full_name ?? null,
        driver_phone: profile?.phone ?? null,
        type: data.type,
        severity: severityForType(data.type),
        description: data.description ?? null,
        reported_lat: data.reported_lat ?? null,
        reported_lng: data.reported_lng ?? null,
        reported_accuracy_m: data.reported_accuracy_m ?? null,
      },
    })

    const driverName = incident.driver_name ?? "A driver"

    // Fire-and-forget: a push failure must never fail the incident write.
    void notifyOpsStaffAlert({
      type: "safety",
      entityId: incident.id,
      submitterName: driverName,
      title: `🚨 SOS — ${formatLabel(incident.type)}`,
      body: `${driverName} · tap to respond`,
      channelId: "safety",
      color: "#dc2626",
    })

    await auditFromDriverUser(auth.access.userId, {
      action: "create",
      entity_type: "safety_incident",
      entity_id: incident.id,
      summary: `Filed SOS #${incident.id} (${incident.type})`,
    })

    try {
      const html = await renderTemplate(SafetyIncidentAlert, {
        incidentId: incident.id,
        driverName,
        driverPhone: incident.driver_phone,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        mapsUrl: mapsUrlFor(incident.reported_lat, incident.reported_lng),
        opsUrl: reviewUrl(`/sos/${incident.id}`),
      })
      await sendAdminEmail(
        `🚨 SOS #${incident.id}: ${formatLabel(incident.type)} — ${driverName}`,
        html,
      )
    } catch (emailError) {
      console.error("[sos] Failed to queue admin email:", emailError)
    }

    return NextResponse.json(
      { success: true, data: toDriverIncident(incident, [], []) },
      { status: 201 },
    )
  } catch (error) {
    console.error("[sos] Failed to create incident:", error)
    return jsonError("Failed to file the report", 500)
  }
}

export async function GET() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const rows = await prisma.safetyIncident.findMany({
    where: { driver_clerk_user_id: auth.access.userId },
    orderBy: { created_at: "desc" },
    take: 50,
    include: { _count: { select: { photos: true } } },
  })

  return NextResponse.json({
    items: rows.map((row) => toOpsIncident(row, row._count.photos)),
  })
}
