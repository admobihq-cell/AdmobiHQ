import type { ReportOverviewDto } from "@workspace/ops-contracts"

import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { MetricTile } from "@workspace/ui/components/dashboard/metric-tile"
import { InsightNote } from "@workspace/ui/components/dashboard/notes"
import { NO_DELIVERY_MESSAGE, compactOrDash } from "@/components/reports/format"

/** The strongest market, time of day and creative in the period, with one plain-language note. */
export function WhatsWorkingCard({
  working,
  hasRows,
  hasImpressions,
}: {
  working: ReportOverviewDto["whatsWorking"]
  hasRows: boolean
  hasImpressions: boolean
}) {
  const { topMarket, topDaypart, topCreative } = working
  const unit = hasImpressions ? "est. impressions" : "plays"

  const note = topMarket
    ? `${topMarket.name} led with ${compactOrDash(topMarket.value)} ${unit}${
        topDaypart ? `, and ${topDaypart.name.toLowerCase()} was the strongest time of day` : ""
      }.`
    : null

  return (
    <DashboardCard title="What's working" description={`Strongest results by ${unit}, in the selected period`}>
      {hasRows ? (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricTile label="Top market" value={topMarket?.name ?? "—"} note={topMarket ? compactOrDash(topMarket.value) : "No data yet"} />
            <MetricTile label="Top time of day" value={topDaypart?.name ?? "—"} note={topDaypart ? compactOrDash(topDaypart.value) : "No data yet"} />
            <MetricTile label="Top creative" value={topCreative?.name ?? "—"} note={topCreative ? compactOrDash(topCreative.value) : "No data yet"} />
          </div>
          {note ? <InsightNote>{note}</InsightNote> : null}
        </>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{NO_DELIVERY_MESSAGE}</p>
      )}
    </DashboardCard>
  )
}
