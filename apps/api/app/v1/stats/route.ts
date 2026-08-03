import { NextResponse } from "next/server"

import { statsRangeSchema } from "@workspace/ops-contracts"

import { jsonError, requireOpsAccess } from "@/lib/api-utils"
import { getContentStats } from "@/lib/queries/content"
import { getOverviewStats, getSubmissionsOverTime } from "@/lib/queries/stats"

export async function GET(req: Request) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const { range } = statsRangeSchema.parse({
    range: searchParams.get("range") ?? "30d",
  })

  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 365 : 30

  try {
    const [overview, timeline, content] = await Promise.all([
      getOverviewStats(range),
      getSubmissionsOverTime(days),
      getContentStats(),
    ])

    return NextResponse.json({ overview, timeline, content })
  } catch (error: unknown) {
    console.error("[ops /api/stats]", error)
    const message =
      error instanceof Error ? error.message : "Database query failed"
    return jsonError(message, 503)
  }
}
