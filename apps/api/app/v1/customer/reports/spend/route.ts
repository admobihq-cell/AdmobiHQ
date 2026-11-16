import { NextResponse } from "next/server"

import { getReportSpend } from "@/lib/analytics/report-queries"
import { reportRequest } from "@/lib/analytics/report-request"

/** Spend, cost per 1,000 and budget burn. Needs `reports:read` and `billing:read`. */
export async function GET(req: Request) {
  const request = await reportRequest(req, { billing: true })
  if (request.error) return request.error
  return NextResponse.json(await getReportSpend(request.scope))
}
