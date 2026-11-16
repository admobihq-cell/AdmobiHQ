"use client"

import { useState } from "react"
import Link from "next/link"
import { formatCompact, formatKes } from "@workspace/ops-contracts"

import { Card, CardContent } from "@workspace/ui/components/card"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { FunnelBars } from "@workspace/ui/components/charts/funnel-bars"
import { Heatmap } from "@workspace/ui/components/charts/heatmap"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { SegmentGauge } from "@workspace/ui/components/charts/segment-gauge"
import { ShareBar } from "@workspace/ui/components/charts/share-bar"
import { TickBar } from "@workspace/ui/components/charts/tick-bar"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { ActionQueue } from "@workspace/ui/components/dashboard/action-queue"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { HeroMetric } from "@workspace/ui/components/dashboard/hero-metric"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import {
  EMPTY_DELIVERY,
  HEALTH_LABEL,
  HEALTH_TONE,
  compactOrDash,
  percentOrDash,
  rateTone,
  waiting,
} from "@/components/dashboards/format"
import type { CampaignHealthRow, DeliveryDto, InventoryDto, PipelineDto } from "@/lib/queries/campaign-analytics"

const PHASE: Record<string, string> = { live: "Live", scheduled: "Scheduled", completed: "Completed", unscheduled: "Not scheduled" }

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export function PipelineTab({ data }: { data: PipelineDto }) {
  const hours = data.avgReviewHours
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent>
            {data.bookedKes ? (
              <HeroMetric
                label="Booked budget"
                value={formatKes(data.bookedKes.current)}
                deltas={[{ label: "vs previous period", delta: data.bookedKes, good: "up" }]}
                note="Budget of campaigns approved in the period"
              />
            ) : (
              <HeroMetric label="Live campaigns" value={String(data.live)} note="Budget figures need finance access" />
            )}
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <KpiStrip
            columns={4}
            className="h-full"
            items={[
              { label: "Live", value: String(data.live), note: "In market today" },
              { label: "In review", value: String(data.inReview), note: "Waiting for a decision" },
              { label: "Approval rate", value: percentOrDash(data.approvalRate), note: "Approved ÷ (approved + rejected)" },
              { label: "Avg review time", value: hours === null ? "—" : waiting(hours), note: "Submitted to decision" },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Review funnel"
          description="Campaigns submitted in the period, and how far they got"
          isEmpty={data.funnel[0]?.value === 0}
          emptyMessage="No campaigns were submitted in this period."
          table={{ columns: ["Step", "Campaigns"], rows: data.funnel.map((f) => [f.label, f.value]) }}
        >
          <FunnelBars steps={data.funnel} />
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          title="Submitted vs approved"
          description="Campaigns per day"
          isEmpty={data.trend.every((p) => p.submitted === 0 && p.approved === 0)}
          emptyMessage="No submissions or approvals in this period."
          table={{ columns: ["Day", "Submitted", "Approved"], rows: data.trend.map((p) => [p.day, Number(p.submitted), Number(p.approved)]) }}
        >
          <TrendChart data={data.trend} series={[{ key: "submitted", label: "Submitted" }, { key: "approved", label: "Approved" }]} />
        </ChartCard>
      </div>

      <DashboardCard title="Review queue" description="Oldest first. Waiting time is since the advertiser submitted">
        <ActionQueue
          empty="No campaigns are waiting for review."
          LinkComponent={Link}
          items={data.queue.map((q) => ({
            title: q.name,
            meta: `${q.orgName} · waiting ${waiting(q.waitingHours)}${q.budgetKes !== null ? ` · ${formatKes(q.budgetKes)}` : ""}`,
            action: "Review",
            tag: q.waitingHours >= 48 ? { label: "Overdue", tone: "serious" as const } : q.waitingHours >= 24 ? { label: "Waiting", tone: "warning" as const } : undefined,
            href: `/campaigns/${q.id}`,
          }))}
        />
      </DashboardCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

const HEALTH_FILTERS = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
]

const HEALTH_COLUMNS: LedgerColumn<CampaignHealthRow>[] = [
  {
    key: "name",
    header: "Campaign",
    className: "min-w-44",
    render: (r) => (
      <div>
        <Link href={`/campaigns/${r.id}`} className="font-medium hover:underline">
          {r.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {PHASE[r.phase] ?? r.phase}
          {r.market ? ` · ${r.market}` : ""}
        </p>
      </div>
    ),
  },
  {
    key: "org",
    header: "Account",
    className: "min-w-40",
    render: (r) => (
      <div>
        {r.orgId ? (
          <Link href={`/advertiser-orgs/${r.orgId}`} className="hover:underline">
            {r.orgName}
          </Link>
        ) : (
          <span className="text-muted-foreground">{r.orgName}</span>
        )}
        {r.contact ? <p className="text-xs text-muted-foreground">{r.contact}</p> : null}
      </div>
    ),
  },
  {
    key: "health",
    header: "Status",
    className: "min-w-40 whitespace-normal",
    render: (r) => (
      <div className="flex flex-col items-start gap-1">
        <StatusPill tone={HEALTH_TONE[r.health.level]}>{HEALTH_LABEL[r.health.level]}</StatusPill>
        <span className="text-xs text-muted-foreground">{r.health.reason}</span>
      </div>
    ),
  },
  { key: "delivery", header: "Delivery", render: (r) => <TickBar percent={r.deliveryRate === null ? null : r.deliveryRate * 100} tone={rateTone(r.deliveryRate)} /> },
  { key: "impressions", header: "Est. impressions", align: "right", render: (r) => compactOrDash(r.impressionsLikely) },
  { key: "next", header: "Next action", className: "min-w-36 whitespace-normal", render: (r) => r.health.nextAction ?? "None" },
]

export function DeliveryTab({ data }: { data: DeliveryDto }) {
  const [filter, setFilter] = useState("all")
  const rows = data.rows.filter((r) => filter === "all" || r.health.level !== "on_track")
  const count = (level: string) => data.rows.filter((r) => r.health.level === level).length

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard title="Network delivery rate" description="Delivered ÷ scheduled across every campaign, over-delivery not counted">
          {data.hasRows ? (
            <SegmentGauge value={(data.networkRate ?? 0) * 100} max={100} label={`${data.delivered.toLocaleString("en-KE")} of ${data.scheduled.toLocaleString("en-KE")} plays`} />
          ) : (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{EMPTY_DELIVERY}</p>
          )}
        </DashboardCard>
        <ChartCard title="Delivery by market" description="Plays delivered on schedule" isEmpty={data.byMarket.length === 0} emptyMessage={EMPTY_DELIVERY} table={{ columns: ["Market", "Plays"], rows: data.byMarket.map((m) => [m.name, m.value]) }}>
          <RankBars data={data.byMarket} valueFormatter={formatCompact} />
        </ChartCard>
        <ChartCard title="Missed spots by time of day" description="Where the schedule fell short" isEmpty={data.missedByDaypart.every((d) => d.value === 0)} emptyMessage={data.hasRows ? "No missed spots in this period." : EMPTY_DELIVERY} table={{ columns: ["Time of day", "Missed"], rows: data.missedByDaypart.map((d) => [d.name, d.value]) }}>
          <RankBars data={data.missedByDaypart} valueFormatter={formatCompact} />
        </ChartCard>
      </div>

      <LedgerCard
        title="Campaign health"
        description="Every campaign across all accounts. Health uses each campaign's whole flight so far"
        summary={[
          { label: "At risk", value: count("at_risk") + count("action_needed"), note: "Need action" },
          { label: "Watch", value: count("watch"), note: "Worth monitoring" },
          { label: "On track", value: count("on_track"), note: "Nothing to do" },
          { label: "Campaigns", value: data.rows.length, note: "Not draft or canceled" },
        ]}
        filterTabs={{
          tabs: HEALTH_FILTERS.map((f) => ({ ...f, count: f.value === "all" ? data.rows.length : data.rows.filter((r) => r.health.level !== "on_track").length })),
          value: filter,
          onChange: setFilter,
        }}
        columns={HEALTH_COLUMNS}
        rows={rows}
        rowKey={(r) => String(r.id)}
        footer={{ viewing: `Viewing ${rows.length} out of ${data.rows.length}`, page: 1, pageCount: 1, onPageChange: () => {} }}
        empty="No campaigns match."
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inventory mix
// ---------------------------------------------------------------------------

const FORMAT_LABEL: Record<string, string> = { taxi_top: "Taxi top", delivery_bike: "Delivery bike", both: "Both" }
const DAYPARTS = ["Morning", "Midday", "Evening", "Night"]

export function InventoryTab({ data }: { data: InventoryDto }) {
  const markets = [...new Set(data.marketByDaypart.map((c) => c.market))].sort()
  const hasEstimate = data.marketByDaypart.some((c) => c.value !== null)
  const noEstimate = "Audience estimates appear here once campaigns have modelled data."

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {data.budgetByFormat ? (
          <ChartCard
            title="Budget by format"
            description="Approved campaigns that haven't finished"
            isEmpty={data.budgetByFormat.length === 0}
            emptyMessage="No approved campaigns are booked."
            table={{ columns: ["Format", "KES"], rows: data.budgetByFormat.map((f) => [FORMAT_LABEL[f.name] ?? f.name, f.value]) }}
          >
            <ShareBar data={data.budgetByFormat.map((f) => ({ ...f, name: FORMAT_LABEL[f.name] ?? f.name }))} valueFormatter={formatKes} />
          </ChartCard>
        ) : (
          <DashboardCard title="Budget by format" description="Approved campaigns that haven't finished">
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">Budget figures need finance access.</p>
          </DashboardCard>
        )}
        <ChartCard title="Impressions by market" description="Estimated, in the period" isEmpty={data.impressionsByMarket.length === 0} emptyMessage={noEstimate} table={{ columns: ["Market", "Est. impressions"], rows: data.impressionsByMarket.map((m) => [m.name, m.value]) }}>
          <RankBars data={data.impressionsByMarket} valueFormatter={formatCompact} />
        </ChartCard>
      </div>

      <ChartCard
        title="Market × time of day"
        description="Estimated impressions. Darker is more"
        isEmpty={!hasEstimate}
        emptyMessage={noEstimate}
        table={{ columns: ["Market", "Time of day", "Est. impressions"], rows: data.marketByDaypart.map((c) => [c.market, c.daypart, c.value]) }}
      >
        <Heatmap rows={markets} columns={DAYPARTS} cells={data.marketByDaypart.map((c) => ({ row: c.market, column: c.daypart, value: c.value }))} valueFormatter={formatCompact} />
      </ChartCard>

      <LedgerCard
        title="Ending soon"
        description="Live campaigns that finish in the next 14 days"
        columns={[
          { key: "name", header: "Campaign", className: "min-w-44", render: (r) => <Link href={`/campaigns/${r.id}`} className="font-medium hover:underline">{r.name}</Link> },
          { key: "org", header: "Account", render: (r) => r.orgName },
          { key: "ends", header: "Ends", render: (r) => r.endsOn },
          { key: "left", header: "Days left", align: "right", render: (r) => String(r.daysLeft) },
          { key: "delivery", header: "Delivery", render: (r) => <TickBar percent={r.deliveryRate === null ? null : r.deliveryRate * 100} tone={rateTone(r.deliveryRate)} /> },
        ]}
        rows={data.endingSoon}
        rowKey={(r) => String(r.id)}
        empty="No campaigns end in the next 14 days."
      />
    </div>
  )
}
