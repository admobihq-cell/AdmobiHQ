"use client"

import Link from "next/link"
import { foldOther, type Delta } from "@workspace/ops-contracts"
import { Car, FileText, Mail, Megaphone, Truck } from "lucide-react"

import { CmsHealthCard } from "@/components/content/cms-health-card"
import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { DonutChart } from "@workspace/ui/components/charts/donut-chart"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import type { ActionQueueItem } from "@/lib/queries/action-queue"

type Named = Array<{ name: string; value: number }>

export type OverviewForm = "leads" | "fleet" | "drivers" | "waitlist" | "mediaKit"

/** Every field is already cut down server-side to the viewer's permissions; null = not theirs to see. */
type OverviewData = {
  submissions: {
    forms: Array<{ key: OverviewForm; value: number; delta: Delta }>
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
  /** KES booked per day in the period, for the banner's trend line. */
  bookedTrend: Array<{ day: string; value: number }> | null
}

const FORM_TILES: Record<OverviewForm, { label: string; icon: React.ReactNode; href: string }> = {
  leads: { label: "Campaign leads", icon: <Megaphone />, href: "/leads" },
  fleet: { label: "Fleet partners", icon: <Truck />, href: "/fleet" },
  drivers: { label: "Drivers", icon: <Car />, href: "/drivers" },
  waitlist: { label: "Waitlist", icon: <Mail />, href: "/waitlist" },
  mediaKit: { label: "Media kit", icon: <FileText />, href: "/media-kit" },
}

const NO_DATA = "Nothing was submitted in this period."

export function OverviewDashboard({ data, error }: { data?: OverviewData; error?: string | null }) {
  if (!data) return <ApiErrorBanner message={error ?? "Could not load dashboard data."} />

  // The headline figure and the action queue live on the banner (overview-welcome.tsx).
  const { submissions, timeline, content } = data
  const breakdowns = submissions
    ? [
        submissions.byType.length > 1 ? (
          <ChartCard key="type" title="By type" description="Submissions per form" isEmpty={submissions.byType.every((t) => t.value === 0)} emptyMessage={NO_DATA} table={{ columns: ["Form", "Submissions"], rows: submissions.byType.map((t) => [t.name, t.value]) }}>
            <DonutChart
              data={submissions.byType.filter((t) => t.value > 0)}
              centerLabel={{ label: "Submissions", value: String(submissions.total) }}
            />
          </ChartCard>
        ) : null,
        submissions.budgetMix ? (
          <ChartCard key="budget" title="Campaign budget mix" description="Budget ranges chosen on the lead form" isEmpty={submissions.budgetMix.length === 0} emptyMessage={NO_DATA} table={{ columns: ["Budget", "Leads"], rows: submissions.budgetMix.map((t) => [t.name, t.value]) }}>
            <RankBars data={submissions.budgetMix} />
          </ChartCard>
        ) : null,
        submissions.driversByCity ? (
          <ChartCard key="city" title="Drivers by city" description="Driver sign-ups in the period" isEmpty={submissions.driversByCity.length === 0} emptyMessage={NO_DATA} table={{ columns: ["City", "Drivers"], rows: submissions.driversByCity.map((t) => [t.name, t.value]) }}>
            <DonutChart half data={foldOther([...submissions.driversByCity].sort((a, b) => b.value - a.value), 5)} />
          </ChartCard>
        ) : null,
      ].filter(Boolean)
    : []

  const [firstBreakdown, ...restBreakdowns] = breakdowns

  return (
    <div className="flex flex-col gap-4">
      {submissions ? (
        <KpiStrip
          variant="cards"
          LinkComponent={Link}
          items={submissions.forms.map((f) => ({
            ...FORM_TILES[f.key],
            value: String(f.value),
            delta: { delta: f.delta, good: "up" as const },
          }))}
        />
      ) : null}

      {timeline ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <ChartCard
            className={firstBreakdown ? "xl:col-span-2" : "xl:col-span-3"}
            title="Submissions over time"
            description="All public forms, per day"
            isEmpty={timeline.every((p) => p.count === 0)}
            emptyMessage={NO_DATA}
            table={{ columns: ["Day", "Submissions"], rows: timeline.map((p) => [p.day, p.count]) }}
          >
            <TrendChart data={timeline} series={[{ key: "count", label: "Submissions" }]} />
          </ChartCard>
          {firstBreakdown}
        </div>
      ) : null}

      {(timeline ? restBreakdowns : breakdowns).length > 0 ? (
        <div className={timeline ? "grid gap-4 lg:grid-cols-2" : "grid gap-4 lg:grid-cols-3"}>
          {timeline ? restBreakdowns : breakdowns}
        </div>
      ) : null}

      {content ? <CmsHealthCard content={content} /> : null}
    </div>
  )
}
