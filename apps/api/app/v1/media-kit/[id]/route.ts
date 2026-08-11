import { NextResponse } from "next/server"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { mediaKitUpdateSchema } from "@/lib/validation/schemas"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("media_kit")
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const item = await prisma.mediaKitRequest.findUnique({ where: { id } })
  if (!item) return jsonError("Not found", 404)

  return NextResponse.json(item)
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("media_kit")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, mediaKitUpdateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.mediaKitRequest.update({
    where: { id },
    data: parsed.data,
  })

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "media_kit",
    entity_id: id,
    summary: `Updated media kit #${id}`,
    metadata: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("media_kit")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const existing = await prisma.mediaKitRequest.findUnique({ where: { id } })
  if (!existing) return jsonError("Not found", 404)
  if (existing.deleted_at) return NextResponse.json({ success: true })

  await prisma.mediaKitRequest.update({
    where: { id },
    data: { deleted_at: new Date(), deleted_by_email: access.email },
  })
  await auditFromOpsUser(access, {
    action: "delete",
    entity_type: "media_kit",
    entity_id: id,
    summary: `Deleted media kit #${id}`,
  })
  return NextResponse.json({ success: true })
}
