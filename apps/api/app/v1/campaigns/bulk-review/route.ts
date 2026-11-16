import { NextResponse } from "next/server"

import { bulkReviewSchema, type BulkReviewResult } from "@workspace/ops-contracts"

import { parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { reviewCampaign } from "@/lib/campaigns/review-campaign"

/** Bulk approve/reject from the ops campaign queue. Each id goes through the
 * same reviewCampaign() as the single route; anything not "submitted" is
 * skipped (never walked back), not failed. Sequential on purpose: each row
 * sends an email, and 100 rows is the cap. */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, bulkReviewSchema)
  if ("error" in parsed) return parsed.error
  const { ids, decision, reason } = parsed.data

  const result: BulkReviewResult = { updated: [], skipped: [] }
  for (const id of [...new Set(ids)]) {
    const outcome = await reviewCampaign(
      auth.access,
      id,
      { decision, reason },
      { allowUnapprove: false },
    )
    if (outcome.ok) result.updated.push(id)
    else result.skipped.push({ id, error: outcome.error })
  }

  return NextResponse.json(result)
}
