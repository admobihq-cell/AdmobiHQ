"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { LifeBuoy, Wallet } from "lucide-react"
import { formatCompact, payoutFocus } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { AlertStrip } from "@workspace/ui/components/dashboard/notes"
import { DashboardToolbar, type ToolbarRange } from "@workspace/ui/components/dashboard/dashboard-toolbar"
import { HeroMetric } from "@workspace/ui/components/dashboard/hero-metric"
import { KpiStrip, type KpiItem } from "@workspace/ui/components/dashboard/kpi-strip"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"

import { Greeting } from "@/components/overview/greeting"
import { LatestPayoutCard, PAYOUT_DETAILS_HREF, SUPPORT_HREF } from "@/components/overview/latest-payout-card"
import { RecentUpdates } from "@/components/overview/recent-updates"
import { SampleLabel } from "@/components/sample-tag"
import { bestTimes, formatHours, formatKm, sampleTelemetry, shortDay } from "@/lib/sample-data"

const DAY_NAME: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
}
import { monthName, useDriverPayouts } from "@/lib/use-driver-payouts"

/** Plain-language note under the toolbar: screen figures are samples until telemetry exists. */
const SAMPLE_NOTE = "Screen time, plays, distance and areas are sample figures until your roof screen reports. Payouts and updates are real."

/**
 * The driver's console: how much the screen ran and where (Sample), then the real money and
 * news. Full width, built from the same dashboard kit as the advertiser and ops apps.
 */
export function DashboardView({ payoutDestination }: { payoutDestination: string | null }) {
  const [range, setRange] = useState<ToolbarRange>({ range: "7d" })
  const t = useMemo(() => sampleTelemetry(range), [range])
  const payouts = useDriverPayouts()
  const focus = payouts.data ? payoutFocus(payouts.data) : null

  const avgHours = t.totals.activeDays ? t.totals.hours / t.totals.activeDays : 0
  const kpis: KpiItem[] = [
    {
      label: <SampleLabel>Ads shown</SampleLabel>,
      value: formatCompact(t.totals.plays),
      note: "Times an ad played on your screen",
      delta: { delta: t.deltas.plays, good: "up" },
    },
    {
      label: <SampleLabel>Distance</SampleLabel>,
      value: formatKm(t.totals.km),
      note: "Driven with the screen on",
      delta: { delta: t.deltas.km, good: "up" },
    },
    {
      label: <SampleLabel>Days worked</SampleLabel>,
      value: `${t.totals.activeDays} of ${t.days.length}`,
      note: "Days your screen was on",
    },
    {
      label: <SampleLabel>Hours a day</SampleLabel>,
      value: formatHours(Math.round(avgHours * 10) / 10),
      note: "Average on the days you worked",
    },
  ]
  const longest = t.days.reduce<(typeof t.days)[number] | undefined>((best, d) => (!best || d.hours > best.hours ? d : best), undefined)
  const best = bestTimes(t.heat)
  const topArea = t.areas[0]

  const trend = t.days.map((d) => ({ day: d.day, hours: d.hours }))

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            <Greeting />
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your screen time, where you drove, and what Admobi has paid you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10 gap-2">
            <Link href={SUPPORT_HREF}>
              <LifeBuoy className="size-4" aria-hidden />
              Get help
            </Link>
          </Button>
          <Button asChild className="h-10 gap-2">
            <Link href="/earnings">
              <Wallet className="size-4" aria-hidden />
              Earnings
            </Link>
          </Button>
        </div>
      </div>

      <DashboardToolbar
        range={range}
        onRangeChange={setRange}
        badge={<StatusPill tone="neutral">Sample screen data</StatusPill>}
      />

      {focus?.kind === "problem" ? (
        <AlertStrip
          className="border-destructive/30 bg-destructive/5"
          title={`Your ${monthName(focus.payout.periodMonth)} payout didn't go through`}
          body="Usually the M-Pesa number or bank account is wrong. Check it and we'll resend."
          action={
            <Button asChild size="sm">
              <Link href={PAYOUT_DETAILS_HREF}>Check payout details</Link>
            </Button>
          }
        />
      ) : payouts.data && !payoutDestination ? (
        <AlertStrip
          title="Add your payout details"
          body="Admobi can't pay you until there's an M-Pesa number or bank account on your profile."
          action={
            <Button asChild size="sm">
              <Link href={PAYOUT_DETAILS_HREF}>Add details</Link>
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent>
            <HeroMetric
              label={<SampleLabel>Screen-on time</SampleLabel>}
              value={formatHours(t.totals.hours)}
              deltas={[{ label: "vs previous period", delta: t.deltas.hours, good: "up" }]}
              note="Hours your roof screen was on and showing ads"
              series={trend.map((d) => ({ day: d.day, value: d.hours }))}
            />
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <KpiStrip items={kpis} columns={4} className="h-full" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={<SampleLabel>Screen time by day</SampleLabel>}
          description="Hours the screen was on, per day in the period"
          takeaway={longest && longest.hours > 0 ? `Your longest day was ${shortDay(longest.day)}: ${formatHours(longest.hours)}.` : undefined}
          isEmpty={t.totals.hours === 0}
          emptyMessage="No screen time in this period."
          table={{ columns: ["Day", "Hours", "Plays", "Km"], rows: t.days.map((d) => [d.day, d.hours, d.plays, d.km]) }}
        >
          <TrendChart data={trend} series={[{ key: "hours", label: "Screen-on hours" }]} valueFormatter={formatHours} />
        </ChartCard>
        <LatestPayoutCard destination={payoutDestination} showHistoryLink />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title={<SampleLabel>Top areas</SampleLabel>}
          description="Where your screen spent the most time"
          takeaway={topArea ? `You spent the most time in ${topArea.name}: ${formatHours(topArea.value)}.` : undefined}
          isEmpty={t.areas.length === 0}
          emptyMessage="No driving in this period."
          table={{ columns: ["Area", "Hours"], rows: t.areas.map((a) => [a.name, a.value]) }}
          action={
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link href="/routes">Routes</Link>
            </Button>
          }
        >
          <RankBars data={t.areas} valueFormatter={formatHours} />
        </ChartCard>
        <DashboardCard
          title={<SampleLabel>Best times to drive</SampleLabel>}
          description="When your screen shows the most ads"
        >
          {best.length === 0 ? (
            <p className="text-sm text-muted-foreground">No driving in this period.</p>
          ) : (
            <>
              <p className="text-sm font-medium">
                Your best time is {DAY_NAME[best[0]!.day] ?? best[0]!.day}, {best[0]!.band}.
              </p>
              <ol className="divide-y rounded-lg border">
                {best.map((slot, i) => (
                  <li key={`${slot.day}-${slot.band}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="font-medium">
                        {DAY_NAME[slot.day] ?? slot.day}, {slot.band}
                      </span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">~{slot.plays} ads</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </DashboardCard>
        <RecentUpdates />
      </div>

      <p className="text-xs text-muted-foreground">{SAMPLE_NOTE}</p>
    </div>
  )
}
