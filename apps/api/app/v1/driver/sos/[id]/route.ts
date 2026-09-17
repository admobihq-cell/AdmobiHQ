import { NextResponse } from "next/server"

import { safetyIncidentDriverUpdateSchema } from "@workspace/ops-contracts"

import { auditFromDriverUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireDriverAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { isTerminalStatus, toDriverIncident } from "@/lib/safety-incident"
import { appendSystemUpdate, loadOwnedIncident } from "@/lib/safety-incident-store"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const incident = await loadOwnedIncident(id, auth.access.userId)
  if (!incident) return jsonError("Not found", 404)

  const [photos, updates] = await Promise.all([
    prisma.safetyIncidentPhoto.findMany({
      where: { incident_id: id },
      orderBy: { created_at: "asc" },
    }),
    prisma.safetyIncidentUpdate.findMany({
      where: { incident_id: id },
      orderBy: { created_at: "asc" },
    }),
  ])

  // toDriverIncident strips internal ops notes — see its doc comment.
  return NextResponse.json(toDriverIncident(incident, photos, updates))
}

/**
 * Driver-side cancel only. The schema is a literal "cancelled", so every other
 * transition is already a 400 before this handler decides anything — resolving
 * an incident is ops-only, and a driver must not be able to close their own
 * emergency as "handled".
 */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const incident = await loadOwnedIncident(id, auth.access.userId)
  if (!incident) return jsonError("Not found", 404)

  const parsed = await parseJsonBody(req, safetyIncidentDriverUpdateSchema)
  if ("error" in parsed) return parsed.error

  if (isTerminalStatus(incident.status)) {
    return jsonError("This incident is already closed", 409)
  }

  const updated = await prisma.safetyIncident.update({
    where: { id },
    data: { status: "cancelled" },
  })

  await appendSystemUpdate(id, "Driver cancelled this report.")

  await auditFromDriverUser(auth.access.userId, {
    action: "update",
    entity_type: "safety_incident",
    entity_id: id,
    summary: `Cancelled SOS #${id}`,
  })

  const updates = await prisma.safetyIncidentUpdate.findMany({
    where: { incident_id: id },
    orderBy: { created_at: "asc" },
  })

  return NextResponse.json(toDriverIncident(updated, [], updates))
}
