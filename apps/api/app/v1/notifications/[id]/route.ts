import { NextResponse } from "next/server"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, requireOpsAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/** Soft delete — keeps the row (and its push-ticket history) for ops audit, hides it from the customer feed. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error
  const { access } = auth

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
