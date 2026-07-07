import { NextResponse } from "next/server"
import { z } from "zod"

import { requireOpsUser } from "@/lib/auth"
import { jsonError } from "@/lib/api-utils"
import { getContentStats } from "@/lib/queries/content"
import { getOverviewStats, getSubmissionsOverTime } from "@/lib/queries/stats"

const querySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
})

export async function GET(req: Request) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { searchParams } = new URL(req.url)
  const { range } = querySchema.parse({
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
