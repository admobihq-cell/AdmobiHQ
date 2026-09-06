import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { fetchCampaignCreative } from "@/lib/campaign-creative-storage"
import type { PrivateResourceType } from "@/lib/private-media"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; creativeId: string }> }

/** Ops-side counterpart to
 * /v1/customer/campaigns/:id/creatives/:creativeId/file — same
 * mint-signed-URL-and-stream approach, gated by ops permission + campaign_id
 * match instead of advertiser ownership. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const { id: rawId, creativeId: rawCreativeId } = await params
  const campaignId = parseId(rawId)
  const creativeId = parseId(rawCreativeId)
  if (!campaignId || !creativeId) return jsonError("Invalid id", 400)

  const creative = await prisma.campaignCreative.findUnique({ where: { id: creativeId } })
  if (!creative || creative.campaign_id !== campaignId) {
    return jsonError("Not found", 404)
  }

  let upstream: Response
  try {
    upstream = await fetchCampaignCreative(
      creative.cloudinary_public_id,
      creative.resource_type as PrivateResourceType,
      creative.content_type,
    )
  } catch (error) {
    console.error("[ops campaign creative file]", error)
    return jsonError("Failed to load creative", 502)
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": creative.content_type,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  })
}
