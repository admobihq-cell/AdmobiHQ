import { NextResponse } from "next/server"

import { jsonError, requireOpsAdminAccess } from "@/lib/api-utils"
import { listPlatformUsers, type PlatformUserSortField } from "@/lib/platform-users"

const SORT_FIELDS: PlatformUserSortField[] = ["email", "phone", "createdAt"]

export async function GET(req: Request) {
  // Admin-only, matching the ops Users page (users/layout.tsx): this pages
  // through every customer and driver contact in Clerk, so it must not be
  // reachable by an ops member whose role grants no section permissions.
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  if (type !== "drivers" && type !== "customers") {
    return jsonError('type must be "drivers" or "customers"', 400)
  }

  const query = searchParams.get("query") ?? undefined
  const limit = searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined
  const offset = searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined
  const sortByRaw = searchParams.get("sortBy")
  const sortBy = SORT_FIELDS.includes(sortByRaw as PlatformUserSortField)
    ? (sortByRaw as PlatformUserSortField)
    : undefined
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc"

  try {
    const body = await listPlatformUsers({ type, query, limit, offset, sortBy, sortDir })
    return NextResponse.json(body)
  } catch (error) {
    console.error(`[v1/users] failed to list ${type}:`, error)
    return jsonError("Failed to load users", 502)
  }
}
