import { NextResponse } from "next/server"

import { jsonError, parseId, requireDriverAccess } from "@/lib/api-utils"
import {
  buildIncidentPhotoPublicId,
  uploadIncidentPhoto,
} from "@/lib/incident-photo-storage"
import { prisma } from "@/lib/prisma"
import { canAcceptPhoto, isTerminalStatus, toIncidentPhoto } from "@/lib/safety-incident"
import { loadOwnedIncident } from "@/lib/safety-incident-store"

type Params = { params: Promise<{ id: string }> }

/**
 * One photo per call. Unlike driver documents there is no replace-existing
 * branch: an incident accumulates up to four photos rather than holding one
 * per type.
 *
 * Photos are uploaded AFTER the incident exists, from the tracking screen —
 * ops is alerted the moment the driver taps Send, and a failed upload can
 * never lose the report.
 */
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

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return jsonError("Missing file", 400)
  }

  const count = await prisma.safetyIncidentPhoto.count({ where: { incident_id: id } })
  const check = canAcceptPhoto(count, file)
  if (!check.ok) {
    return jsonError(check.reason, 400)
  }

  const publicId = buildIncidentPhotoPublicId(id, crypto.randomUUID())
  const uploaded = await uploadIncidentPhoto(file, publicId)

  const created = await prisma.safetyIncidentPhoto.create({
    data: {
      incident_id: id,
      cloudinary_public_id: uploaded.publicId,
      content_type: uploaded.contentType,
      size_bytes: uploaded.sizeBytes,
    },
  })

  // Surface the new evidence in the ops list's activity ordering.
  await prisma.safetyIncident.update({ where: { id }, data: { updated_at: new Date() } })

  return NextResponse.json(toIncidentPhoto(created), { status: 201 })
}
