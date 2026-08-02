import { NextResponse } from "next/server"

import { auditFromOpsUser } from "@/lib/audit"
import { requireOpsUser } from "@/lib/auth"
import { jsonError, parseId } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/** Soft delete — keeps the row (and its push-ticket history) for audit, hides it from ops and the customer feed. */
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

  const existing = await prisma.announcementBroadcast.findUnique({ where: { id } })
  if (!existing) return jsonError("Not found", 404)
  if (existing.deleted_at) return NextResponse.json({ success: true })

  await prisma.announcementBroadcast.update({
    where: { id },
    data: { deleted_at: new Date(), deleted_by_email: access.email },
  })

  await auditFromOpsUser(access, {
    action: "delete",
    entity_type: "announcement",
    entity_id: id,
    summary: `Deleted announcement #${id} (${existing.title})`,
  })

  return NextResponse.json({ success: true })
}
