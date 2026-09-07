import type { SafetyIncident } from "@prisma/client"

import { prisma } from "@/lib/prisma"

/**
 * Loads an incident only if it belongs to this driver. Every driver-facing
 * route goes through this rather than a bare findUnique — a plain id lookup
 * plus a forgotten ownership check is how one driver reads another's
 * emergency.
 *
 * Returns null for "not yours" as well as "doesn't exist", so callers answer
 * 404 for both and never leak whether an id is real.
 */
export async function loadOwnedIncident(
  id: number,
  driverClerkUserId: string,
): Promise<SafetyIncident | null> {
  const incident = await prisma.safetyIncident.findUnique({ where: { id } })
  if (!incident) return null
  if (incident.driver_clerk_user_id !== driverClerkUserId) return null
  return incident
}

/**
 * Lifecycle events (acknowledged / resolved / cancelled) land in the same
 * thread the humans write to, so the detail view is one chronological feed
 * rather than a timeline plus a separate conversation.
 */
export async function appendSystemUpdate(incidentId: number, body: string): Promise<void> {
  await prisma.safetyIncidentUpdate.create({
    data: { incident_id: incidentId, author_type: "system", body },
  })
}
