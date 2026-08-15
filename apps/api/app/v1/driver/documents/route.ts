import { NextResponse } from "next/server"

import { driverDocumentTypeSchema } from "@workspace/ops-contracts"

import { auditFromDriverUser } from "@/lib/audit"
import { jsonError, requireDriverAccess } from "@/lib/api-utils"
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  buildDriverDocumentPublicId,
  destroyDriverDocument,
  uploadDriverDocument,
} from "@/lib/driver-document-storage"
import { toDriverDocumentDto } from "@/lib/driver-profile-dto"
import { EDITABLE_STATUSES, getOrCreateDriverProfile } from "@/lib/driver-profile-store"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const form = await req.formData()
  const file = form.get("file")
  const typeParsed = driverDocumentTypeSchema.safeParse(form.get("type"))

  if (!(file instanceof File)) {
    return jsonError("Missing file", 400)
  }
  if (!typeParsed.success) {
    return jsonError("Invalid or missing document type", 400)
  }
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return jsonError("Document must be JPEG, PNG, or WebP", 400)
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return jsonError("Document must be under 8MB", 400)
  }

  const type = typeParsed.data
  const profile = await getOrCreateDriverProfile(auth.access.userId)
  if (!EDITABLE_STATUSES.has(profile.status)) {
    return jsonError(`Documents can't be uploaded while status is "${profile.status}"`, 409)
  }

  const existing = profile.documents.find((doc) => doc.type === type)

  const publicId = buildDriverDocumentPublicId(profile.id, type, crypto.randomUUID())
  const uploaded = await uploadDriverDocument(file, publicId)

  const created = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.driverDocument.delete({ where: { id: existing.id } })
    }
    return tx.driverDocument.create({
      data: {
        profile_id: profile.id,
        type,
        cloudinary_public_id: uploaded.publicId,
        content_type: uploaded.contentType,
        size_bytes: uploaded.sizeBytes,
        original_filename: file.name || null,
      },
    })
  })

  if (existing) {
    await destroyDriverDocument(existing.cloudinary_public_id)
  }

  await auditFromDriverUser(auth.access.userId, {
    action: existing ? "update" : "create",
    entity_type: "driver_document",
    entity_id: created.id,
    summary: `Driver profile #${profile.id} ${existing ? "replaced" : "uploaded"} "${type}" document`,
  })

  return NextResponse.json(toDriverDocumentDto(created), { status: 201 })
}
