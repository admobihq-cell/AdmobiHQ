import { NextResponse } from "next/server"

import { getCampaignReport } from "@/lib/analytics/report-queries"
import { reportRequest } from "@/lib/analytics/report-request"
import { jsonError, parseId } from "@/lib/api-utils"

type Params = { params: Promise<{ id: string }> }

/** The full report for one campaign. Another org's id answers 404. `reports:read`. */
export async function GET(req: Request, { params }: Params) {
  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  // The path id is the campaign filter, so ownership is checked the same way for every report.
  const url = new URL(req.url)
  url.searchParams.set("campaign", String(id))
  const request = await reportRequest(new Request(url, { headers: req.headers }))
  if (request.error) return request.error

  const report = await getCampaignReport(request.scope)
  return report ? NextResponse.json(report) : jsonError("Not found", 404)
}
