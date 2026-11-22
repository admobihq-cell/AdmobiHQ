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

export type OverviewForm = "leads" | "fleet" | "drivers" | "waitlist" | "mediaKit"

/** Every field is already cut down server-side to the viewer's permissions; null = not theirs to see. */
type OverviewData = {
  submissions: {
    forms: Array<{ key: OverviewForm; value: number }>
    total: number
    byType: Named
    budgetMix: Named | null
    driversByCity: Named | null
  } | null
  /** All forms combined, so only for viewers who can open every form. */
  timeline: Array<{ day: string; count: number }> | null
  content: {
    blog: { total: number; published: number; draft: number }
    help: { total: number; published: number; draft: number }
    media: { total: number; totalSize: number }
  } | null
  /** Counts from the other dashboards the viewer can open. */
  actions: ActionQueueItem[]
  /** Budget approved in the period; only for viewers who hold both campaigns and finances. */
  booked: Delta | null
}

const FORM_TILES: Record<OverviewForm, { label: string; icon: React.ReactNode }> = {
  leads: { label: "Campaign leads", icon: <Megaphone /> },
  fleet: { label: "Fleet partners", icon: <Truck /> },
  drivers: { label: "Drivers", icon: <Car /> },
  waitlist: { label: "Waitlist", icon: <Mail /> },
  mediaKit: { label: "Media kit", icon: <FileText /> },
}

const NO_DATA = "Nothing was submitted in this period."

export function OverviewDashboard({ data, error }: { data?: OverviewData; error?: string | null }) {
  if (!data) return <ApiErrorBanner message={error ?? "Could not load dashboard data."} />

  const { submissions, timeline, content, actions, booked } = data
  const hero = booked ? (
    <HeroMetric
      label="Booked this period"
      value={formatKes(booked.current)}
      deltas={[{ label: "vs previous period", delta: booked, good: "up" }]}
      note="Budget of campaigns approved in the period"
    />
  ) : submissions ? (
    <HeroMetric label="Total submissions" value={String(submissions.total)} note="Across the public forms you can open, in the period" />
  ) : null
  const breakdowns = submissions
    ? [
        submissions.byType.length > 1 ? (
          <ChartCard key="type" title="By type" description="Submissions per form" isEmpty={submissions.byType.every((t) => t.value === 0)} emptyMessage={NO_DATA} table={{ columns: ["Form", "Submissions"], rows: submissions.byType.map((t) => [t.name, t.value]) }}>
            <RankBars data={submissions.byType} />
          </ChartCard>
        ) : null,
        submissions.budgetMix ? (
          <ChartCard key="budget" title="Campaign budget mix" description="Budget ranges chosen on the lead form" isEmpty={submissions.budgetMix.length === 0} emptyMessage={NO_DATA} table={{ columns: ["Budget", "Leads"], rows: submissions.budgetMix.map((t) => [t.name, t.value]) }}>
            <RankBars data={submissions.budgetMix} />
          </ChartCard>
        ) : null,
        submissions.driversByCity ? (
          <ChartCard key="city" title="Drivers by city" description="Driver sign-ups in the period" isEmpty={submissions.driversByCity.length === 0} emptyMessage={NO_DATA} table={{ columns: ["City", "Drivers"], rows: submissions.driversByCity.map((t) => [t.name, t.value]) }}>
            <RankBars data={submissions.driversByCity} />
          </ChartCard>
        ) : null,
      ].filter(Boolean)
    : []

  return (
    <div className="flex flex-col gap-4">
      {hero ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className={submissions ? "shadow-xs" : "shadow-xs xl:col-span-3"}>
            <CardContent>{hero}</CardContent>
          </Card>
          {submissions ? (
            <div className="xl:col-span-2">
              <KpiStrip
                className="h-full"
                items={submissions.forms.map((f) => ({ ...FORM_TILES[f.key], value: String(f.value) }))}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {timeline ? (
          <ChartCard
            className="xl:col-span-2"
            title="Submissions over time"
            description="All public forms, per day"
            isEmpty={timeline.every((p) => p.count === 0)}
            emptyMessage={NO_DATA}
            table={{ columns: ["Day", "Submissions"], rows: timeline.map((p) => [p.day, p.count]) }}
          >
            <TrendChart data={timeline} series={[{ key: "count", label: "Submissions" }]} />
          </ChartCard>
        ) : null}
        <DashboardCard
          className={timeline ? undefined : "xl:col-span-3"}
          title="Action queue"
          description="What needs someone, from the sections you can open"
        >
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

      {breakdowns.length > 0 ? <div className="grid gap-4 lg:grid-cols-3">{breakdowns}</div> : null}

      {content ? <CmsHealthCard content={content} /> : null}
    </div>
  )
}
