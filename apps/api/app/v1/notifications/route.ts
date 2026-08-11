import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { listAnnouncementBroadcasts } from "@/lib/queries/entities"
import { checkPendingPushReceipts } from "@/lib/push/receipts"

/** Kept small so opening the list never waits on a large receipt sweep. */
const INLINE_RECEIPT_LIMIT = 100

export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("announcements")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const params = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
    sortDir: searchParams.get("sortDir") ?? "desc",
  })

  // Resolve outstanding receipts before reading, so delivery counts catch up
  // whenever ops opens the page rather than only on the nightly cron.
  try {
    await checkPendingPushReceipts({ limit: INLINE_RECEIPT_LIMIT })
  } catch (error: unknown) {
    console.error("[ops /api/notifications GET] receipt check failed", error)
  }

  try {
    const result = await listAnnouncementBroadcasts(params)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("[ops /api/notifications GET]", error)
    return jsonError(
      error instanceof Error ? error.message : "Database query failed",
      503,
    )
  }
}
