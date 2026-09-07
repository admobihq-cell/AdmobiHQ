import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { formatLabel, safetyIncidentOpsUpdateSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { toIncidentPhoto, toIncidentUpdate, toOpsIncident } from "@/lib/safety-incident"
import { appendSystemUpdate } from "@/lib/safety-incident-store"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("safety")
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const incident = await prisma.safetyIncident.findUnique({
    where: { id },
    include: { photos: { orderBy: { created_at: "asc" } } },
  })
  if (!incident) return jsonError("Not found", 404)

  // Ops sees internal notes — unlike toDriverIncident, which filters them.
  const updates = await prisma.safetyIncidentUpdate.findMany({
    where: { incident_id: id },
    orderBy: { created_at: "asc" },
  })

  return NextResponse.json({
    ...toOpsIncident(incident, incident.photos.length),
    photos: incident.photos.map(toIncidentPhoto),
    updates: updates.map(toIncidentUpdate),
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("safety")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, safetyIncidentOpsUpdateSchema)
  if ("error" in parsed) return parsed.error

  const existing = await prisma.safetyIncident.findUnique({ where: { id } })
  if (!existing) return jsonError("Not found", 404)

  const now = new Date()
  // Built explicitly rather than spread from the body: the stamped
  // acknowledged_at / resolved_at fields are the whole value of this route,
  // and a blind spread would let a client set them directly.
  const data: Prisma.SafetyIncidentUpdateInput = {}
  const systemLines: string[] = []

  if (parsed.data.severity && parsed.data.severity !== existing.severity) {
    data.severity = parsed.data.severity
    systemLines.push(`Severity changed to ${parsed.data.severity}.`)
  }

  if (parsed.data.status && parsed.data.status !== existing.status) {
    if (parsed.data.status === "cancelled") {
      return jsonError("Only the driver can cancel a report — resolve it instead", 400)
    }
    if (parsed.data.status === "resolved" && !parsed.data.resolution?.trim()) {
      return jsonError("A resolution note is required to resolve an incident", 400)
    }

    data.status = parsed.data.status
    systemLines.push(`Status changed to ${formatLabel(parsed.data.status)}.`)

    // First acknowledgement only — re-acknowledging must not restart the clock
    // the whole SLA display is measured against.
    if (parsed.data.status !== "new" && !existing.acknowledged_at) {
      data.acknowledged_at = now
      data.acknowledged_by_email = access.email
    }
    if (parsed.data.status === "resolved") {
      data.resolved_at = now
      data.resolved_by_email = access.email
      data.resolution = parsed.data.resolution!.trim()
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(toOpsIncident(existing, 0))
  }

  const updated = await prisma.safetyIncident.update({ where: { id }, data })

  if (systemLines.length > 0) {
    await appendSystemUpdate(id, systemLines.join(" "))
  }

  // Fire-and-forget: the driver's existing notification bell reads these rows.
  // A notification failure must not fail the status change ops just made.
  try {
    if (data.acknowledged_at) {
      await prisma.driverNotification.create({
        data: {
          clerk_user_id: existing.driver_clerk_user_id,
          type: "sos_acknowledged",
          title: "We've seen your report",
          body: "Someone from the Admobi team is on it and will be in touch.",
        },
      })
    }
    if (data.status === "resolved") {
      await prisma.driverNotification.create({
        data: {
          clerk_user_id: existing.driver_clerk_user_id,
          type: "sos_resolved",
          title: "Your report was resolved",
          body: parsed.data.resolution!.trim().slice(0, 240),
        },
      })
    }
  } catch (notifyError) {
    console.error("[sos] Failed to write driver notification:", notifyError)
  }

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "safety_incident",
    entity_id: id,
    summary: `Updated SOS #${id}${parsed.data.status ? ` status → ${parsed.data.status}` : ""}`,
    metadata: parsed.data as Record<string, unknown>,
  })

  const photoCount = await prisma.safetyIncidentPhoto.count({ where: { incident_id: id } })
  return NextResponse.json(toOpsIncident(updated, photoCount))
}
