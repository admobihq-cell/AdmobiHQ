import { jsonError, parseId, requireDriverAccess } from "@/lib/api-utils"
import { fetchDriverDocument } from "@/lib/driver-document-storage"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/** Private-serving proxy: the only way a document's bytes ever reach a
 * client. Ownership is checked before minting a fresh signed Cloudinary URL
 * server-side — that URL is fetched here and streamed back, never handed to
 * the browser directly. 404 (not 403) on mismatch so a driver enumerating
 * ids can't tell someone else's document exists. */
export async function GET(_req: Request, { params }: Params) {
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

  let upstream: Response
  try {
    upstream = await fetchDriverDocument(doc.cloudinary_public_id)
  } catch (error) {
    console.error("[driver documents file]", error)
    return jsonError("Failed to load document", 502)
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": doc.content_type,
      // "private" keeps this out of any shared/CDN cache; a short max-age
      // just lets the *same* authorized browser reuse it across quick
      // remounts (e.g. reopening the settings sheet) instead of re-running
      // the full sign-and-fetch-from-Cloudinary round trip every time.
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  })
}
