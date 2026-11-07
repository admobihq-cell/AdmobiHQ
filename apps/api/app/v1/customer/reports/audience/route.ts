import { NextResponse } from "next/server"

import { getReportAudience } from "@/lib/analytics/report-queries"
import { reportRequest } from "@/lib/analytics/report-request"

/** Where and when ads were seen: market and daypart heatmaps, reach for one campaign. `reports:read`. */
export async function GET(req: Request) {
  const request = await reportRequest(req)
  if (request.error) return request.error
  return NextResponse.json(await getReportAudience(request.scope))
}
