import { NextResponse } from "next/server"

import { safetyIncidentMessageCreateSchema } from "@workspace/ops-contracts"

import { jsonError, parseId, parseJsonBody, requireDriverAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { isTerminalStatus, toIncidentUpdate } from "@/lib/safety-incident"
import { loadOwnedIncident } from "@/lib/safety-incident-store"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const incident = await loadOwnedIncident(id, auth.access.userId)
  if (!incident) return jsonError("Not found", 404)

  if (isTerminalStatus(incident.status)) {
    return jsonError("This incident is closed", 409)
  }

  const parsed = await parseJsonBody(req, safetyIncidentMessageCreateSchema)
  if ("error" in parsed) return parsed.error

  const created = await prisma.safetyIncidentUpdate.create({
    data: {
      incident_id: id,
      author_type: "driver",
      author_clerk_id: auth.access.userId,
      body: parsed.data.body,
      // Hardcoded, NOT taken from the body: internal_note is ops-only, and a
      // driver writing one would hide their own message from themselves.
      internal_note: false,
    },
  })

  // Touch the incident so the ops list re-sorts by activity, not just by
  // filing time — a driver adding detail is a reason to look again.
  await prisma.safetyIncident.update({ where: { id }, data: { updated_at: new Date() } })

  return NextResponse.json(toIncidentUpdate(created), { status: 201 })
}
