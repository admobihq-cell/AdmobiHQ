import { jsonError, parseId, requireCustomerAccess } from "@/lib/api-utils"
import { fetchCampaignCreative } from "@/lib/campaign-creative-storage"
import { getOwnedCampaign } from "@/lib/campaign-store"
import type { PrivateResourceType } from "@/lib/private-media"

type Params = { params: Promise<{ id: string; creativeId: string }> }

/** Private-serving proxy: the only way a creative's bytes ever reach a client.
 * Ownership is checked before minting a fresh signed Cloudinary URL
 * server-side — that URL is fetched here and streamed back, never handed to
 * the browser. 404 (not 403) on mismatch so an advertiser enumerating ids
 * can't tell someone else's creative exists. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const { id: rawId, creativeId: rawCreativeId } = await params
  const id = parseId(rawId)
  const creativeId = parseId(rawCreativeId)
  if (!id || !creativeId) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.userId, id)
  const creative = campaign?.creatives.find((c) => c.id === creativeId)
  if (!creative) return jsonError("Not found", 404)

  let upstream: Response
  try {
    upstream = await fetchCampaignCreative(
      creative.cloudinary_public_id,
      creative.resource_type as PrivateResourceType,
      creative.content_type,
    )
  } catch (error) {
    console.error("[customer campaign creative file]", error)
    return jsonError("Failed to load creative", 502)
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": creative.content_type,
      // "private" keeps this out of any shared/CDN cache; a short max-age lets
      // the same authorized browser reuse it across quick remounts instead of
      // re-running the full sign-and-fetch round trip.
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  })
}
