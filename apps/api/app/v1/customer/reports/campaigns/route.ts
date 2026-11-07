import { NextResponse } from "next/server"

import { exportFileName, toCsv } from "@workspace/ops-contracts"

import { getCampaignRows } from "@/lib/analytics/report-queries"
import { reportRequest } from "@/lib/analytics/report-request"

const CSV_COLUMNS = [
  "campaign", "status", "phase", "starts_on", "ends_on", "budget_kes", "spent_kes", "plays_scheduled",
  "plays_delivered", "delivery_rate", "impressions_low", "impressions_likely", "impressions_high",
  "cost_per_1000_kes", "health",
]

/** One row per campaign with health. `export=csv` downloads the table; money columns are blank without `billing:read`. */
export async function GET(req: Request) {
  const request = await reportRequest(req)
  if (request.error) return request.error
  const rows = await getCampaignRows(request.scope)

  if (new URL(req.url).searchParams.get("export") !== "csv") return NextResponse.json({ items: rows })

  const body = toCsv(
    rows.map((r) => ({
      campaign: r.name,
      status: r.status,
      phase: r.phase ?? "",
      starts_on: r.startsOn ?? "",
      ends_on: r.endsOn ?? "",
      budget_kes: r.budgetKes,
      spent_kes: r.spentKes,
      plays_scheduled: r.playsScheduled,
      plays_delivered: r.playsDelivered,
      delivery_rate: r.deliveryRate === null ? null : Math.round(r.deliveryRate * 1000) / 10,
      impressions_low: r.impressions.low,
      impressions_likely: r.impressions.likely,
      impressions_high: r.impressions.high,
      cost_per_1000_kes: r.costPerThousandKes === null ? null : Math.round(r.costPerThousandKes * 100) / 100,
      health: r.health.level,
    })),
    CSV_COLUMNS
  )
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName("campaign report", null, "csv")}"`,
    },
  })
}
