import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { fetchDriverDocument } from "@/lib/driver-document-storage"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; docId: string }> }

/** Ops-side counterpart to /v1/driver/documents/:id/file — same
 * mint-signed-URL-and-stream approach, gated by ops permission + profile_id
 * match instead of clerk_user_id ownership. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("driver_applications")
  if (auth.error) return auth.error

  const { id: rawId, docId: rawDocId } = await params
  const profileId = parseId(rawId)
  const docId = parseId(rawDocId)
  if (!profileId || !docId) return jsonError("Invalid id", 400)

  const doc = await prisma.driverDocument.findUnique({ where: { id: docId } })
  if (!doc || doc.profile_id !== profileId) {
    return jsonError("Not found", 404)
  }

  let upstream: Response
  try {
    upstream = await fetchDriverDocument(doc.cloudinary_public_id)
  } catch (error) {
    console.error("[driver-applications documents file]", error)
    return jsonError("Failed to load document", 502)
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": doc.content_type,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  })
}
