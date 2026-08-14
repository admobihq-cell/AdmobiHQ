import { NextResponse } from "next/server"

import { auditFromDriverUser } from "@/lib/audit"
import { jsonError, parseId, requireDriverAccess } from "@/lib/api-utils"
import { destroyDriverDocument } from "@/lib/driver-document-storage"
import { EDITABLE_STATUSES } from "@/lib/driver-profile-store"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const doc = await prisma.driverDocument.findUnique({
    where: { id },
    include: { profile: true },
  })
  if (!doc || doc.profile.clerk_user_id !== auth.access.userId) {
    return jsonError("Not found", 404)
  }
  if (!EDITABLE_STATUSES.has(doc.profile.status)) {
    return jsonError(`Documents can't be removed while status is "${doc.profile.status}"`, 409)
  }

  await prisma.driverDocument.delete({ where: { id } })
  await destroyDriverDocument(doc.cloudinary_public_id)

  await auditFromDriverUser(auth.access.userId, {
    action: "delete",
    entity_type: "driver_document",
    entity_id: id,
    summary: `Driver profile #${doc.profile_id} removed "${doc.type}" document`,
  })

  return NextResponse.json({ success: true })
}
