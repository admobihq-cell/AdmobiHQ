import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { fetchCampaignCreative } from "@/lib/campaigns/campaign-creative-storage"
import { getOwnedMediaAsset } from "@/lib/campaigns/media-asset-store"
import type { PrivateResourceType } from "@/lib/storage/private-media"

type Params = { params: Promise<{ id: string }> }

/** Private-serving proxy for a library file, the sibling of
 * /v1/customer/campaigns/:id/creatives/:creativeId/file. The org is checked
 * before a signed Cloudinary URL is minted server-side; that URL is fetched
 * here and streamed back, never handed to the browser. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:read")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const asset = await getOwnedMediaAsset(auth.access.orgId, id)
  if (!asset) return jsonError("Not found", 404)

  let upstream: Response
  try {
    upstream = await fetchCampaignCreative(
      asset.cloudinary_public_id,
      asset.resource_type as PrivateResourceType,
      asset.content_type,
    )
  } catch (error) {
    console.error("[customer media file]", error)
    return jsonError("Failed to load file", 502)
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": asset.content_type,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  })
}
