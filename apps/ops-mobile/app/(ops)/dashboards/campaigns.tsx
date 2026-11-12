import { useState } from "react"
import { useRouter } from "expo-router"
import {
  ChartCard,
  Heatmap,
  HeroMetric,
  KpiStrip,
  RankBars,
  SegmentTabs,
  ShareBar,
  TrendChart,
  type ChartPalette,
} from "@workspace/mobile-charts"
import {
  EMPTY_DELIVERY,
  HEALTH_LABEL,
  HEALTH_TONE,
  formatKes,
  percentOrDash,
  waiting,
  type DeliveryDto,
  type InventoryDto,
  type PipelineDto,
} from "@workspace/ops-contracts"

import { DashboardScreen, Note, QueueList } from "@/components/dashboards/dashboard-screen"

type Tab = "pipeline" | "delivery" | "inventory"

const PHASE: Record<string, string> = { live: "Live", scheduled: "Scheduled", completed: "Completed", unscheduled: "Not scheduled" }
const FORMAT_LABEL: Record<string, string> = { taxi_top: "Taxi top", delivery_bike: "Delivery bike", both: "Both" }
const DAYPARTS = ["Morning", "Midday", "Evening", "Night"]
const NO_ESTIMATE = "Audience estimates appear here once campaigns have modelled data."

/** The Campaigns dashboard, the same three tabs as the ops console. Budget figures arrive only with `finances`. */
export default function CampaignsDashboardScreen() {
  const [tab, setTab] = useState<Tab>("pipeline")
  const router = useRouter()
  const open = (id: number) => () => router.push(`/(ops)/campaigns/${id}`)
  const frame = {
    title: "Campaigns",
    permission: "campaigns" as const,
    header: (palette: ChartPalette) => (
      <SegmentTabs<Tab>
        palette={palette}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pipeline", label: "Pipeline" },
          { value: "delivery", label: "Delivery" },
          { value: "inventory", label: "Inventory mix" },
        ]}
      />
    ),
  }

  if (tab === "delivery") {
    return (
      <DashboardScreen<DeliveryDto> {...frame} name="campaigns-delivery" load={(c, range) => c.dashboards.campaignsDelivery(range)}>
        {(data, palette) => <Delivery data={data} palette={palette} open={open} />}
      </DashboardScreen>
    )
  }
  if (tab === "inventory") {
    return (
      <DashboardScreen<InventoryDto> {...frame} name="campaigns-inventory" load={(c, range) => c.dashboards.campaignsInventory(range)}>
        {(data, palette) => <Inventory data={data} palette={palette} open={open} />}
      </DashboardScreen>
    )
  }
  return (
    <DashboardScreen<PipelineDto> {...frame} name="campaigns-pipeline" load={(c, range) => c.dashboards.campaignsPipeline(range)}>
      {(data, palette) => <Pipeline data={data} palette={palette} open={open} />}
    </DashboardScreen>
  )
}

type TabProps<T> = { data: T; palette: ChartPalette; open: (id: number) => () => void }

function Pipeline({ data, palette, open }: TabProps<PipelineDto>) {
  const hours = data.avgReviewHours
  return (
    <>
      {data.bookedKes ? (
        <>
          <HeroMetric label="Booked budget" value={formatKes(data.bookedKes.current)} delta={{ delta: data.bookedKes, good: "up" }} palette={palette} />
          <Note palette={palette}>Budget of campaigns approved in the period</Note>
        </>
      ) : (
        <>
          <HeroMetric label="Live campaigns" value={String(data.live)} palette={palette} />
          <Note palette={palette}>Budget figures need finance access</Note>
        </>
      )}
      <KpiStrip
        palette={palette}
        items={[
          { label: "Live", value: String(data.live), note: "In market today" },
          { label: "In review", value: String(data.inReview), note: "Waiting for a decision" },
          { label: "Approval rate", value: percentOrDash(data.approvalRate), note: "Approved ÷ (approved + rejected)" },
          { label: "Avg review time", value: hours === null ? "—" : waiting(hours), note: "Submitted to decision" },
        ]}
      />
      <ChartCard
        title="Review funnel"
        description="Campaigns submitted in the period, and how far they got"
        isEmpty={!data.funnel[0]?.value}
        emptyMessage="No campaigns were submitted in this period."
        palette={palette}
      >
        <RankBars data={data.funnel.map((f) => ({ name: f.label, value: f.value }))} palette={palette} />
      </ChartCard>
      <ChartCard
        title="Submitted vs approved"
        description="Campaigns per day"
        isEmpty={data.trend.every((p) => p.submitted === 0 && p.approved === 0)}
        emptyMessage="No submissions or approvals in this period."
        palette={palette}
      >
        <TrendChart points={data.trend} series={[{ key: "submitted", label: "Submitted" }, { key: "approved", label: "Approved" }]} palette={palette} />
      </ChartCard>
      <ChartCard
        title="Review queue"
        description="Oldest first. Waiting time is since the advertiser submitted"
        isEmpty={data.queue.length === 0}
        emptyMessage="No campaigns are waiting for review."
        palette={palette}
      >
        <QueueList
          palette={palette}
          items={data.queue.map((q) => ({
            key: String(q.id),
            title: q.name,
            meta: `${q.orgName} · waiting ${waiting(q.waitingHours)}${q.budgetKes !== null ? ` · ${formatKes(q.budgetKes)}` : ""}`,
            tag: q.waitingHours >= 48 ? { label: "Overdue", tone: "serious" } : q.waitingHours >= 24 ? { label: "Waiting", tone: "warning" } : undefined,
            onPress: open(q.id),
          }))}
        />
      </ChartCard>
    </>
  )
}

function Delivery({ data, palette, open }: TabProps<DeliveryDto>) {
  const [filter, setFilter] = useState<"all" | "attention">("all")
  const attention = data.rows.filter((r) => r.health.level !== "on_track")
  const rows = filter === "all" ? data.rows : attention
  const count = (level: string) => data.rows.filter((r) => r.health.level === level).length

  return (
    <>
      <HeroMetric label="Network delivery rate" value={data.hasRows ? percentOrDash(data.networkRate) : "—"} palette={palette} />
      <Note palette={palette}>
        {data.hasRows
          ? `${data.delivered.toLocaleString("en-KE")} of ${data.scheduled.toLocaleString("en-KE")} plays. Over-delivery is not counted`
          : EMPTY_DELIVERY}
      </Note>
      <ChartCard title="Delivery by market" description="Plays delivered on schedule" isEmpty={data.byMarket.length === 0} emptyMessage={EMPTY_DELIVERY} palette={palette}>
        <RankBars data={data.byMarket} palette={palette} />
      </ChartCard>
      <ChartCard
        title="Missed spots by time of day"
        description="Where the schedule fell short"
        isEmpty={data.missedByDaypart.every((d) => d.value === 0)}
        emptyMessage={data.hasRows ? "No missed spots in this period." : EMPTY_DELIVERY}
        palette={palette}
      >
        <RankBars data={data.missedByDaypart} palette={palette} />
      </ChartCard>
      <KpiStrip
        palette={palette}
        items={[
          { label: "At risk", value: String(count("at_risk") + count("action_needed")), note: "Need action" },
          { label: "Watch", value: String(count("watch")), note: "Worth monitoring" },
          { label: "On track", value: String(count("on_track")), note: "Nothing to do" },
          { label: "Campaigns", value: String(data.rows.length), note: "Not draft or canceled" },
        ]}
      />
      <ChartCard
        title="Campaign health"
        description="Every campaign across all accounts. Health uses each campaign's whole flight so far"
        isEmpty={data.rows.length === 0}
        emptyMessage="No campaigns match."
        palette={palette}
      >
        <SegmentTabs<"all" | "attention">
          palette={palette}
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All", badge: data.rows.length },
            { value: "attention", label: "Needs attention", badge: attention.length },
          ]}
        />
        {rows.length === 0 ? <Note palette={palette}>No campaigns match.</Note> : null}
        <QueueList
          palette={palette}
          items={rows.map((r) => ({
            key: String(r.id),
            title: r.name,
            meta: [PHASE[r.phase] ?? r.phase, r.market, r.orgName].filter(Boolean).join(" · "),
            detail: r.health.nextAction ? `${r.health.reason}. Next: ${r.health.nextAction}` : r.health.reason,
            tag: { label: HEALTH_LABEL[r.health.level], tone: HEALTH_TONE[r.health.level] },
            trailing: percentOrDash(r.deliveryRate),
            onPress: open(r.id),
          }))}
        />
      </ChartCard>
    </>
  )
}

function Inventory({ data, palette, open }: TabProps<InventoryDto>) {
  const markets = [...new Set(data.marketByDaypart.map((c) => c.market))].sort()
  return (
    <>
      <ChartCard
        title="Budget by format"
        description="Approved campaigns that haven't finished"
        isEmpty={!data.budgetByFormat?.length}
        emptyMessage={data.budgetByFormat ? "No approved campaigns are booked." : "Budget figures need finance access."}
        palette={palette}
      >
        <ShareBar data={(data.budgetByFormat ?? []).map((f) => ({ ...f, name: FORMAT_LABEL[f.name] ?? f.name }))} palette={palette} />
      </ChartCard>
      <ChartCard title="Impressions by market" description="Estimated, in the period" isEmpty={data.impressionsByMarket.length === 0} emptyMessage={NO_ESTIMATE} palette={palette}>
        <RankBars data={data.impressionsByMarket} palette={palette} />
      </ChartCard>
      <ChartCard
        title="Market × time of day"
        description="Estimated impressions. Darker is more"
        isEmpty={!data.marketByDaypart.some((c) => c.value !== null)}
        emptyMessage={NO_ESTIMATE}
        palette={palette}
      >
        <Heatmap rows={markets} columns={DAYPARTS} cells={data.marketByDaypart.map((c) => ({ x: c.daypart, y: c.market, value: c.value }))} palette={palette} />
      </ChartCard>
      <ChartCard
        title="Ending soon"
        description="Live campaigns that finish in the next 14 days"
        isEmpty={data.endingSoon.length === 0}
        emptyMessage="No campaigns end in the next 14 days."
        palette={palette}
      >
        <QueueList
          palette={palette}
          items={data.endingSoon.map((r) => ({
            key: String(r.id),
            title: r.name,
            meta: `${r.orgName} · ends ${r.endsOn} · ${r.daysLeft}d left`,
            trailing: percentOrDash(r.deliveryRate),
            onPress: open(r.id),
          }))}
        />
      </ChartCard>
    </>
  )
}
