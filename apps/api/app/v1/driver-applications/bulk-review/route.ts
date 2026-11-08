import { NextResponse } from "next/server"

import { bulkReviewSchema, type BulkReviewResult } from "@workspace/ops-contracts"

import { parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { reviewDriverApplication } from "@/lib/driver/review-driver-application"

/** Bulk approve/reject from the ops driver-application queue. Same contract
 * as /v1/campaigns/bulk-review: only "submitted" rows change, the rest are
 * skipped, each row gets its audit row, inbox note and email. */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("driver_applications")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, bulkReviewSchema)
  if ("error" in parsed) return parsed.error
  const { ids, decision, reason } = parsed.data

  const result: BulkReviewResult = { updated: [], skipped: [] }
  for (const id of [...new Set(ids)]) {
    const outcome = await reviewDriverApplication(
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
