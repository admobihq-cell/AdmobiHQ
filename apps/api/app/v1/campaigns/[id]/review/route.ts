import { NextResponse } from "next/server"

import { campaignReviewSchema } from "@workspace/ops-contracts"

import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { reviewCampaign } from "@/lib/campaigns/review-campaign"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, campaignReviewSchema)
  if ("error" in parsed) return parsed.error

  const result = await reviewCampaign(auth.access, id, parsed.data)
  if (!result.ok) return jsonError(result.error, result.status)
  return NextResponse.json(result.value)
}
