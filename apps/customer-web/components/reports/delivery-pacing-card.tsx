"use client"

import type { ReportOverviewDto } from "@workspace/ops-contracts"

import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { PacingBars } from "@workspace/ui/components/charts/pacing-bars"
import { MetricTile } from "@workspace/ui/components/dashboard/metric-tile"
import { NO_DELIVERY_MESSAGE, pacingBars, percentOrDash } from "@/components/reports/format"

/** How much of the schedule ran, as percent of schedule, with a 100% target line. */
export function DeliveryPacingCard({ pacing, hasRows }: { pacing: ReportOverviewDto["pacing"]; hasRows: boolean }) {
  const bars = pacingBars(pacing.days)
  return (
    <ChartCard
      title="Delivery pacing"
      description="Percent of scheduled plays delivered, in the selected period"
      isEmpty={!hasRows}
      emptyMessage={NO_DELIVERY_MESSAGE}
      table={{
        columns: ["Period", "Delivered (% of schedule)"],
        rows: bars.map((b) => [b.period, b.percent === null ? null : `${b.percent}%`]),
      }}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricTile label="Delivered" value={pacing.delivered.toLocaleString("en-KE")} note="Plays on schedule" />
        <MetricTile label="Remaining" value={pacing.remaining.toLocaleString("en-KE")} note="Scheduled, not yet played" />
        <MetricTile label="Rate" value={percentOrDash(pacing.rate)} note="Delivered ÷ scheduled" />
      </div>
      <PacingBars data={bars} />
    </ChartCard>
  )
}
