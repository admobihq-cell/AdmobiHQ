import { NextResponse } from "next/server"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { driverUpdateSchema } from "@/lib/validation/schemas"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("drivers")
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const item = await prisma.driver.findUnique({ where: { id } })
  if (!item) return jsonError("Not found", 404)

  return NextResponse.json(item)
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("drivers")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, driverUpdateSchema)
  if ("error" in parsed) return parsed.error

  const { email, ...rest } = parsed.data
  const data = await prisma.driver.update({
    where: { id },
    data: {
      ...rest,
      ...(email !== undefined
        ? { email: email && email !== "" ? email : null }
        : {}),
    },
  })

  const statusPart =
    parsed.data.status != null ? ` status → ${parsed.data.status}` : ""
  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "driver",
    entity_id: id,
    summary: `Updated driver #${id}${statusPart}`,
    metadata: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("drivers")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const existing = await prisma.driver.findUnique({ where: { id } })
  if (!existing) return jsonError("Not found", 404)
  if (existing.deleted_at) return NextResponse.json({ success: true })

  await prisma.driver.update({
    where: { id },
    data: { deleted_at: new Date(), deleted_by_email: access.email },
  })
  await auditFromOpsUser(access, {
    action: "delete",
    entity_type: "driver",
    entity_id: id,
    summary: `Deleted driver #${id}`,
  })
  return NextResponse.json({ success: true })
}
