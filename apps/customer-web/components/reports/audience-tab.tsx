"use client"

import dynamic from "next/dynamic"
import { DAYPARTS, DAYPART_LABELS, REPORT_MARKETS, formatCompact, reachReading, type ReportAudienceDto } from "@workspace/ops-contracts"

import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { Heatmap } from "@workspace/ui/components/charts/heatmap"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { ShareBar } from "@workspace/ui/components/charts/share-bar"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { MetricTile } from "@workspace/ui/components/dashboard/metric-tile"
import { InsightNote } from "@workspace/ui/components/dashboard/notes"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { NO_DELIVERY_MESSAGE, compactOrDash } from "@/components/reports/format"

// MapLibre and the H3 cell sets are heavy and only this tab needs them.
const MarketMapCard = dynamic(() => import("@/components/reports/market-map-card"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
})

const NO_ESTIMATE_MESSAGE = "Audience estimates appear here once your campaigns have modelled data."
const DAYPART_COLUMNS = DAYPARTS.map((d) => DAYPART_LABELS[d])
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const LOCATION_NOTES: Record<string, string> = {
  CBD: "Mostly office workers and commuters, on foot and in matatus.",
  Westlands: "Offices, malls and nightlife. Strong on evenings and weekends.",
  Karen: "Residential and shopping centres. Fewer people, higher household income.",
  Kilimani: "Apartments and cafes. Steady daytime and early evening traffic.",
  "Mombasa Rd": "Industrial and airport traffic. Long drives, heavy commuter flow.",
  Eastlands: "Dense neighbourhoods and markets. The widest everyday reach.",
}

/** Reports > Audience: where and when your ads were seen. */
export function AudienceTab({ report }: { report: ReportAudienceDto }) {
  const hasEstimate = report.marketByDaypart.some((c) => c.value !== null)
  const emptyMessage = report.hasDeliveryRows ? NO_ESTIMATE_MESSAGE : NO_DELIVERY_MESSAGE
  const impressions = report.marketImpressions.reduce((sum, m) => sum + m.value, 0)
  const reading = report.reach ? reachReading(impressions, report.reach.likely) : null

  const cells = (heat: ReportAudienceDto["marketByDaypart"]) =>
    heat.map((c) => ({ row: c.x, column: c.y, value: c.value }))

  return (
    <div className="grid gap-4">
      <ChartCard
        title="Market × time of day"
        description="Est. impressions. Darker is more"
        isEmpty={!hasEstimate}
        emptyMessage={emptyMessage}
        table={{
          columns: ["Market", "Time of day", "Est. impressions"],
          rows: report.marketByDaypart.map((c) => [c.x, c.y, c.value]),
        }}
      >
        <Heatmap rows={[...REPORT_MARKETS]} columns={DAYPART_COLUMNS} cells={cells(report.marketByDaypart)} valueFormatter={formatCompact} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Markets"
          description="Est. impressions, change on the previous period"
          isEmpty={!hasEstimate}
          emptyMessage={emptyMessage}
          table={{ columns: ["Market", "Est. impressions"], rows: report.byMarket.map((m) => [m.name, m.value]) }}
        >
          <RankBars data={report.byMarket.filter((m) => m.value > 0)} valueFormatter={formatCompact} />
        </ChartCard>
        <ChartCard
          title="Share by time of day"
          description="Where the estimated impressions fell"
          isEmpty={report.daypartShare.length === 0}
          emptyMessage={emptyMessage}
          table={{ columns: ["Time of day", "Est. impressions"], rows: report.daypartShare.map((d) => [d.name, d.value]) }}
        >
          <ShareBar data={report.daypartShare} valueFormatter={formatCompact} />
        </ChartCard>
      </div>

      <ChartCard
        title="Day of week × time of day"
        description="Est. impressions"
        isEmpty={!hasEstimate}
        emptyMessage={emptyMessage}
        table={{
          columns: ["Day", "Time of day", "Est. impressions"],
          rows: report.weekdayByDaypart.map((c) => [c.x, c.y, c.value]),
        }}
      >
        <Heatmap rows={WEEKDAYS} columns={DAYPART_COLUMNS} cells={cells(report.weekdayByDaypart)} valueFormatter={formatCompact} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="Reach and frequency" description="People reached, and how often they saw your ad">
          {report.reach ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <MetricTile
                  label="Est. reach"
                  value={compactOrDash(report.reach.likely)}
                  note={`${formatCompact(report.reach.low)} to ${formatCompact(report.reach.high)}`}
                />
                <MetricTile
                  label="Frequency"
                  value={report.reach.frequency === null ? "—" : `${report.reach.frequency.toFixed(1)}×`}
                  note="Views per person"
                />
                <MetricTile label="As of" value={report.reach.asOf} note="Campaign to date" />
              </div>
              {reading ? <InsightNote>{reading.text}</InsightNote> : null}
            </>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              Reach counts people once, so it can&rsquo;t be added across campaigns. Pick one campaign in Filters to see it.
            </p>
          )}
        </DashboardCard>

        <DashboardCard title="About these places" description="What each market tends to mean for your ad">
          <ul className="grid gap-2 text-sm">
            {REPORT_MARKETS.map((m) => (
              <li key={m}>
                <span className="font-medium">{m}.</span>{" "}
                <span className="text-muted-foreground">{LOCATION_NOTES[m]}</span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>

      {hasEstimate ? <MarketMapCard markets={report.marketImpressions} /> : null}
    </div>
  )
}
