import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { jsonError, requireOpsAccess } from "@/lib/api-utils"
import { listSupportCases } from "@/lib/queries/entities"

export async function GET(req: Request) {
  const auth = await requireOpsAccess()
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
    const result = await listSupportCases({
      ...params,
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      assignedToClerkId: searchParams.get("assignedToClerkId") ?? undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[ops /support GET]", error)
    return jsonError(
      error instanceof Error ? error.message : "Database query failed",
      503,
    )
  }
}
