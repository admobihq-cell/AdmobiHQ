import { NextResponse } from "next/server"

import {
  MEASUREMENT_LEVEL_LABELS,
  exportFileName,
  formatCompact,
  formatKes,
  type CampaignReportDto,
} from "@workspace/ops-contracts"

import { getCampaignReport } from "@/lib/analytics/report-queries"
import { reportRequest } from "@/lib/analytics/report-request"
import { jsonError, parseId } from "@/lib/api-utils"
import { latin1 } from "@/lib/pdf/latin1"
import { renderPdf } from "@/lib/pdf/render-pdf"
import { CampaignStatementPdf } from "@/lib/pdf/templates/campaign-statement-pdf"

type Params = { params: Promise<{ id: string }> }

const count = (n: number) => n.toLocaleString("en-KE")
const percent = (rate: number | null) => (rate === null ? "n/a" : `${Math.round(rate * 100)}%`)

/** Summary lines for the report. Money lines are left out entirely when the caller can't see money. */
function summaryOf(report: CampaignReportDto): { label: string; value: string }[] {
  const { campaign, kpis, budget } = report
  const { impressions } = kpis
  const lines = [
    { label: "Campaign", value: latin1(campaign.name) },
    { label: "Flight", value: campaign.startsOn && campaign.endsOn ? `${campaign.startsOn} to ${campaign.endsOn}` : "Not scheduled" },
    { label: "Market", value: latin1(campaign.market) },
    { label: "Measurement", value: MEASUREMENT_LEVEL_LABELS[report.measurementLevel] },
    { label: "Plays delivered", value: count(kpis.playsDelivered) },
    { label: "Delivery rate", value: percent(kpis.deliveryRate) },
  ]
  if (impressions.likely !== null && impressions.low !== null && impressions.high !== null) {
    lines.push({
      label: "Est. impressions",
      value: `${formatCompact(impressions.likely)} (${formatCompact(impressions.low)} to ${formatCompact(impressions.high)})`,
    })
  }
  if (kpis.reach) {
    lines.push({ label: "Est. reach", value: `${formatCompact(kpis.reach.likely!)}${kpis.frequency ? `, ${kpis.frequency.toFixed(1)} views each` : ""}` })
  }
  if (budget.budgetKes !== null) lines.push({ label: "Budget", value: formatKes(budget.budgetKes) })
  if (budget.spentKes !== null) lines.push({ label: "Spent", value: formatKes(budget.spentKes) })
  if (kpis.costPerThousandKes !== null) lines.push({ label: "Cost per 1,000", value: formatKes(kpis.costPerThousandKes) })
  return lines
}

/**
 * One campaign's report as a PDF: the same numbers as the report page. Money is left out
 * without `billing:read`. Another org's id answers 404.
 */
export async function GET(req: Request, { params }: Params) {
  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const url = new URL(req.url)
  url.searchParams.set("campaign", String(id))
  const request = await reportRequest(new Request(url, { headers: req.headers }))
  if (request.error) return request.error

  const report = await getCampaignReport(request.scope)
  if (!report) return jsonError("Not found", 404)

  const days = report.dailyLog.filter((d) => Number(d.scheduled) > 0 || Number(d.delivered) > 0)
  const sum = (key: string) => days.reduce((total, d) => total + Number(d[key] ?? 0), 0)

  try {
    const bytes = await renderPdf(
      <CampaignStatementPdf
        title="Campaign report"
        subtitle={`${latin1(report.campaign.name)} - ${report.range.start} to ${report.range.end}`}
        summary={summaryOf(report)}
        headers={["Date", "Scheduled", "Delivered", "Missed", "Over-delivered"]}
        rows={days.map((d) => [String(d.day), count(Number(d.scheduled)), count(Number(d.delivered)), count(Number(d.missed)), count(Number(d.over))])}
        totalsRow={["Total", count(sum("scheduled")), count(sum("delivered")), count(sum("missed")), count(sum("over"))]}
        footnote={
          report.measurementLevel === "modelled" || report.measurementLevel === "calibrated"
            ? "Impressions and reach are estimates, shown as a likely figure with a low to high range. They are not counted. Delivery rate ignores plays beyond the schedule."
            : "Plays are counted from the schedule or the vehicle play records. No audience estimate is shown. Delivery rate ignores plays beyond the schedule."
        }
      />,
      {
        metadata: {
          title: `Admobi - Campaign report - ${latin1(report.campaign.name)}`,
          authors: ["Admobi"],
          creationDate: new Date().toISOString().slice(0, 10),
        },
      }
    )
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${exportFileName("campaign report", report.campaign.name, "pdf")}"`,
      },
    })
  } catch (error: unknown) {
    console.error("[customer /v1/customer/reports/campaigns/[id]/pdf GET]", error)
    return jsonError("PDF generation failed", 500)
  }
}
