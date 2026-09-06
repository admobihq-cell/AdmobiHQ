import { safetyIncidentLocationSchema } from "@workspace/ops-contracts"

import { jsonError, parseId, parseJsonBody, requireDriverAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { pingAdmission } from "@/lib/safety-incident"
import { loadOwnedIncident } from "@/lib/safety-incident-store"

type Params = { params: Promise<{ id: string }> }

/**
 * Foreground location re-ping while an incident is open.
 *
 * ponytail: one UPDATE of three columns, no ping-history table. Ops sees the
 * current pin move, not a breadcrumb trail. If a trail is ever needed, add a
 * safety_incident_location_pings table — do not start appending here.
 *
 * Deliberately writes no audit event: at one ping every two minutes this would
 * drown the activity trail for every other action on the platform.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const incident = await loadOwnedIncident(id, auth.access.userId)
  if (!incident) return jsonError("Not found", 404)

  // Checked BEFORE parsing the body on purpose: a stale or terminal client's
  // ping should cost one indexed read and nothing else. 204 rather than an
  // error so a client that has lost track simply stops without retrying.
  const admission = pingAdmission(incident)
  if (admission !== "accept") {
    return new Response(null, { status: 204 })
  }

  const parsed = await parseJsonBody(req, safetyIncidentLocationSchema)
  if ("error" in parsed) return parsed.error

  await prisma.safetyIncident.update({
    where: { id },
    data: {
      last_lat: parsed.data.lat,
      last_lng: parsed.data.lng,
      last_location_at: new Date(),
    },
  })

  return new Response(null, { status: 204 })
}
