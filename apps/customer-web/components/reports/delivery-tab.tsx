"use client"

import { useState } from "react"
import { formatCompact, type CreativeRotationRowDto, type DailyPoint, type ReportDeliveryDto } from "@workspace/ops-contracts"

import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { SegmentGauge } from "@workspace/ui/components/charts/segment-gauge"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { NO_DELIVERY_MESSAGE, compactOrDash } from "@/components/reports/format"

const PAGE_SIZE = 15
const n = (value: unknown) => Number(value ?? 0).toLocaleString("en-KE")

const LOG_COLUMNS: LedgerColumn<DailyPoint>[] = [
  { key: "day", header: "Day", render: (r) => r.day },
  { key: "scheduled", header: "Scheduled", align: "right", render: (r) => n(r.scheduled) },
  { key: "delivered", header: "Delivered", align: "right", render: (r) => n(r.delivered) },
  { key: "missed", header: "Missed", align: "right", render: (r) => n(r.missed) },
  { key: "over", header: "Over-delivered", align: "right", render: (r) => n(r.over) },
]

const CREATIVE_COLUMNS: LedgerColumn<CreativeRotationRowDto>[] = [
  { key: "name", header: "Creative", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "plays", header: "Plays", align: "right", render: (r) => n(r.plays) },
  { key: "share", header: "Share", align: "right", render: (r) => (r.share === null ? "—" : `${Math.round(r.share * 100)}%`) },
  { key: "impressions", header: "Est. impressions", align: "right", render: (r) => compactOrDash(r.impressionsLikely) },
]

/** Reports > Delivery: the online proof of play. */
export function DeliveryTab({ report }: { report: ReportDeliveryDto }) {
  const [page, setPage] = useState(1)
  const empty = !report.hasDeliveryRows
  const { totals } = report

  // Newest day first, and only days that scheduled anything: a log of empty days says nothing.
  const log = [...report.dailyLog].reverse().filter((d) => Number(d.scheduled) > 0 || Number(d.delivered) > 0)
  const pageCount = Math.max(1, Math.ceil(log.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)

  return (
    <div className="grid gap-4">
      <KpiStrip
        columns={3}
        items={[
          { label: "Scheduled", value: totals.scheduled.toLocaleString("en-KE"), note: "Plays booked" },
          { label: "Delivered", value: totals.delivered.toLocaleString("en-KE"), note: "Plays that ran" },
          { label: "Missed", value: totals.missed.toLocaleString("en-KE"), note: "Scheduled but not played" },
          { label: "Over-delivered", value: totals.over.toLocaleString("en-KE"), note: "Beyond the schedule" },
          { label: "Vehicle hours", value: formatCompact(totals.vehicleHours), note: "Time on the road" },
          { label: "Distance", value: `${formatCompact(totals.distanceKm)} km`, note: "Driven while playing" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Scheduled vs delivered"
          description="Plays per day in the selected period"
          isEmpty={empty}
          emptyMessage={NO_DELIVERY_MESSAGE}
          table={{
            columns: ["Day", "Scheduled", "Delivered"],
            rows: report.trend.map((p) => [p.day, Number(p.scheduled), Number(p.delivered)]),
          }}
        >
          <TrendChart
            data={report.trend}
            series={[
              { key: "scheduled", label: "Scheduled", dashed: true, color: "var(--muted-foreground)" },
              { key: "delivered", label: "Delivered" },
            ]}
          />
        </ChartCard>
        <DashboardCard title="Delivery rate" description="Delivered ÷ scheduled, over-delivery not counted">
          {empty ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{NO_DELIVERY_MESSAGE}</p>
          ) : (
            <SegmentGauge value={(report.deliveryRate ?? 0) * 100} max={100} label="Delivery rate" />
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Missed spots by time of day"
          description="Where the schedule fell short"
          isEmpty={empty || report.missedByDaypart.every((d) => d.value === 0)}
          emptyMessage={empty ? NO_DELIVERY_MESSAGE : "No missed spots in this period."}
          table={{ columns: ["Time of day", "Missed"], rows: report.missedByDaypart.map((d) => [d.name, d.value]) }}
        >
          <RankBars data={report.missedByDaypart} />
        </ChartCard>
        <ChartCard
          title="Active vehicles"
          description="The busiest time of day, per campaign, per day"
          isEmpty={empty}
          emptyMessage={NO_DELIVERY_MESSAGE}
          table={{ columns: ["Day", "Vehicles"], rows: report.activeVehiclesTrend.map((p) => [p.day, Number(p.vehicles)]) }}
        >
          <TrendChart data={report.activeVehiclesTrend} series={[{ key: "vehicles", label: "Vehicles" }]} />
        </ChartCard>
      </div>

      <LedgerCard
        title="Creative rotation"
        description="How plays were shared between your creatives"
        columns={CREATIVE_COLUMNS}
        rows={report.creatives}
        rowKey={(r) => r.name}
        empty="Creative plays appear here once your campaigns are reporting."
      />

      <LedgerCard
        title="Daily log"
        description="The same rows as the proof-of-play PDF, newest first"
        columns={LOG_COLUMNS}
        rows={log.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)}
        rowKey={(r) => r.day}
        footer={{
          viewing: `Viewing ${Math.min(PAGE_SIZE, log.length - (current - 1) * PAGE_SIZE)} out of ${log.length}`,
          page: current,
          pageCount,
          onPageChange: setPage,
        }}
        empty={NO_DELIVERY_MESSAGE}
      />
    </div>
  )
}
