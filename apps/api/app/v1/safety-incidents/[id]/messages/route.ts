import { NextResponse } from "next/server"

import { safetyIncidentMessageCreateSchema } from "@workspace/ops-contracts"

import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { toIncidentUpdate } from "@/lib/safety-incident"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("safety")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const incident = await prisma.safetyIncident.findUnique({ where: { id } })
  if (!incident) return jsonError("Not found", 404)

  const parsed = await parseJsonBody(req, safetyIncidentMessageCreateSchema)
  if ("error" in parsed) return parsed.error

  const created = await prisma.safetyIncidentUpdate.create({
    data: {
      incident_id: id,
      author_type: "ops",
      author_email: access.email,
      author_clerk_id: access.userId,
      body: parsed.data.body,
      // Ops is the only side allowed to set this — the driver route hardcodes
      // false. toDriverIncident filters these out of the driver's view.
      internal_note: parsed.data.internal_note ?? false,
    },
  })

  return NextResponse.json(toIncidentUpdate(created), { status: 201 })
}
