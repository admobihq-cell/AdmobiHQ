import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { fetchIncidentPhoto } from "@/lib/incident-photo-storage"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; photoId: string }> }

/**
 * Streams an incident photo to ops. Same mint-signed-URL-and-stream approach
 * as the driver-document file route — the Cloudinary URL is created and
 * consumed inside this process and never reaches the browser.
 */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("safety")
  if (auth.error) return auth.error

  const { id: rawId, photoId: rawPhotoId } = await params
  const incidentId = parseId(rawId)
  const photoId = parseId(rawPhotoId)
  if (!incidentId || !photoId) return jsonError("Invalid id", 400)

  // Matched on BOTH ids so a photo id from another incident can't be read
  // through this path.
  const photo = await prisma.safetyIncidentPhoto.findUnique({ where: { id: photoId } })
  if (!photo || photo.incident_id !== incidentId) {
    return jsonError("Not found", 404)
  }

  let upstream: Response
  try {
    upstream = await fetchIncidentPhoto(photo.cloudinary_public_id, photo.content_type)
  } catch (error) {
    console.error("[safety-incidents photo file]", error)
    return jsonError("Failed to load photo", 502)
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": photo.content_type,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  })
}
