import { NextResponse } from "next/server"

import { auditFromOpsUser } from "@/lib/audit"
import { requireOpsUser } from "@/lib/auth"
import { jsonError, parseId, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { leadUpdateSchema } from "@/lib/validation/schemas"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const item = await prisma.lead.findUnique({ where: { id } })
  if (!item) return jsonError("Not found", 404)

  return NextResponse.json(item)
}

export async function PATCH(req: Request, { params }: Params) {
  let access
  try {
    access = await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, leadUpdateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.lead.update({
    where: { id },
    data: parsed.data,
  })

  const statusPart =
    parsed.data.status != null ? ` status → ${parsed.data.status}` : ""
  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "lead",
    entity_id: id,
    summary: `Updated lead #${id}${statusPart}`,
    metadata: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  let access
  try {
    access = await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  await prisma.lead.delete({ where: { id } })
  await auditFromOpsUser(access, {
    action: "delete",
    entity_type: "lead",
    entity_id: id,
    summary: `Deleted lead #${id}`,
  })
  return NextResponse.json({ success: true })
}
