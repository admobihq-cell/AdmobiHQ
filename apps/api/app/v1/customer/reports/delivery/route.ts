import { NextResponse } from "next/server"

import { exportFileName, toCsv } from "@workspace/ops-contracts"

import { getReportDelivery } from "@/lib/analytics/report-queries"
import { reportRequest } from "@/lib/analytics/report-request"

/** Plays scheduled, delivered and missed: the online proof of play. `export=csv` downloads the daily log. */
export async function GET(req: Request) {
  const request = await reportRequest(req)
  if (request.error) return request.error
  const report = await getReportDelivery(request.scope)

  if (new URL(req.url).searchParams.get("export") !== "csv") return NextResponse.json(report)

  const body = toCsv(report.dailyLog, ["day", "scheduled", "delivered", "missed", "over"])
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName("delivery log", null, "csv")}"`,
    },
  })
}
