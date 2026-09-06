import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { listSafetyIncidents } from "@/lib/queries/entities"

export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("safety")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const params = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
    search: searchParams.get("search") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? "created_at",
    sortDir: searchParams.get("sortDir") ?? "desc",
  })

  try {
    const result = await listSafetyIncidents({
      ...params,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
    })

    // listSafetyIncidents returns rows already serialized by toPaginatedResult
    // (Dates -> ISO strings), so this only reshapes: the relation count
    // becomes photo_count, and the driver's Clerk user id is dropped — ops
    // addresses a driver by name and phone, never by auth id.
    return NextResponse.json({
      ...result,
      items: result.items.map(({ _count, driver_clerk_user_id: _driverId, ...row }) => ({
        ...row,
        photo_count: _count.photos,
      })),
    })
  } catch (error) {
    console.error("[ops /safety-incidents GET]", error)
    return jsonError(
      error instanceof Error ? error.message : "Database query failed",
      503,
    )
  }
}
