import { NextResponse } from "next/server"

import { getReportOverview } from "@/lib/analytics/report-queries"
import { reportRequest } from "@/lib/analytics/report-request"

/** Headline delivery numbers, pacing and campaign health. `reports:read`. Money is null without `billing:read`. */
export async function GET(req: Request) {
  const request = await reportRequest(req)
  if (request.error) return request.error
  return NextResponse.json(await getReportOverview(request.scope))
}
