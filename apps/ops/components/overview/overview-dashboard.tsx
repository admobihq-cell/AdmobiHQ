"use client"

import Link from "next/link"
import { Car, FileText, Mail, Megaphone, Truck } from "lucide-react"
import { formatKes, type Delta } from "@workspace/ops-contracts"

import { CmsHealthCard } from "@/components/content/cms-health-card"
import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Card, CardContent } from "@workspace/ui/components/card"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { ActionQueue } from "@workspace/ui/components/dashboard/action-queue"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { HeroMetric } from "@workspace/ui/components/dashboard/hero-metric"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import type { ActionQueueItem } from "@/lib/queries/action-queue"

type Named = Array<{ name: string; value: number }>

type OverviewData = {
  overview: {
    totals: { all: number; leads: number; fleet: number; drivers: number; waitlist: number; mediaKit: number }
    byType: Named
    budgetMix: Named
    driversByCity: Named
    fleetByCity: Named
    driversByHeard: Named
  }
  timeline: Array<{ day: string; count: number }>
  content: {
    blog: { total: number; published: number; draft: number }
    help: { total: number; published: number; draft: number }
    media: { total: number; totalSize: number }
  } | null
  /** Counts from the other dashboards the viewer can open. */
  actions?: ActionQueueItem[]
  /** Budget approved in the period; only for viewers who hold both campaigns and finances. */
  booked?: Delta | null
}

const EMPTY_OVERVIEW_DATA: OverviewData = {
  overview: {
    totals: { all: 0, leads: 0, fleet: 0, drivers: 0, waitlist: 0, mediaKit: 0 },
    byType: [],
    budgetMix: [],
    driversByCity: [],
    fleetByCity: [],
    driversByHeard: [],
  },
  timeline: [],
  content: null,
}

const NO_DATA = "Nothing was submitted in this period."

export function OverviewDashboard({
  data = EMPTY_OVERVIEW_DATA,
  error,
}: {
  data?: OverviewData
  error?: string | null
}) {
  const { overview, timeline, content, actions = [], booked = null } = data
  const { totals } = overview
  const dash = (value: number) => (error ? "—" : value)

  return (
    <div className="flex flex-col gap-4">
      {error ? <ApiErrorBanner message={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent>
            {booked ? (
              <HeroMetric
                label="Booked this period"
                value={formatKes(booked.current)}
                deltas={[{ label: "vs previous period", delta: booked, good: "up" }]}
                note="Budget of campaigns approved in the period"
              />
            ) : (
              <HeroMetric label="Total submissions" value={String(dash(totals.all))} note="Across every public form in the period" />
            )}
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <KpiStrip
            columns={5}
            className="h-full"
            items={[
              { label: "Campaign leads", value: String(dash(totals.leads)), icon: <Megaphone /> },
              { label: "Fleet partners", value: String(dash(totals.fleet)), icon: <Truck /> },
              { label: "Drivers", value: String(dash(totals.drivers)), icon: <Car /> },
              { label: "Waitlist", value: String(dash(totals.waitlist)), icon: <Mail /> },
              { label: "Media kit", value: String(dash(totals.mediaKit)), icon: <FileText /> },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Submissions over time"
          description="All public forms, per day"
          isEmpty={Boolean(error) || timeline.every((p) => p.count === 0)}
          emptyMessage={error ? "Chart data is unavailable right now." : NO_DATA}
          table={{ columns: ["Day", "Submissions"], rows: timeline.map((p) => [p.day, p.count]) }}
        >
          <TrendChart data={timeline} series={[{ key: "count", label: "Submissions" }]} />
        </ChartCard>
        <DashboardCard title="Action queue" description="What needs someone, from the dashboards you can open">
          <ActionQueue
            empty="Nothing needs attention."
            LinkComponent={Link}
            items={actions.map((a) => ({
              title: `${a.count} ${a.title.toLowerCase()}`,
              meta: a.meta,
              action: a.action,
              tag: { label: a.count > 9 ? "9+" : String(a.count), tone: a.tone },
              href: a.href,
            }))}
          />
        </DashboardCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="By type" description="Submissions per form" isEmpty={Boolean(error) || overview.byType.every((t) => t.value === 0)} emptyMessage={error ? "Breakdown data is unavailable right now." : NO_DATA} table={{ columns: ["Form", "Submissions"], rows: overview.byType.map((t) => [t.name, t.value]) }}>
          <RankBars data={overview.byType} />
        </ChartCard>
        <ChartCard title="Campaign budget mix" description="Budget ranges chosen on the lead form" isEmpty={overview.budgetMix.length === 0} emptyMessage={NO_DATA} table={{ columns: ["Budget", "Leads"], rows: overview.budgetMix.map((t) => [t.name, t.value]) }}>
          <RankBars data={overview.budgetMix} />
        </ChartCard>
        <ChartCard title="Drivers by city" description="Driver sign-ups in the period" isEmpty={overview.driversByCity.length === 0} emptyMessage={NO_DATA} table={{ columns: ["City", "Drivers"], rows: overview.driversByCity.map((t) => [t.name, t.value]) }}>
          <RankBars data={overview.driversByCity} />
        </ChartCard>
      </div>

      {content ? <CmsHealthCard content={content} /> : null}
    </div>
  )
}
