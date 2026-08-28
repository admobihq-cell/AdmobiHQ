import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { listAnnouncementBroadcasts } from "@/lib/queries/entities"

export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("announcements")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const params = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
    sortDir: searchParams.get("sortDir") ?? "desc",
  })

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
