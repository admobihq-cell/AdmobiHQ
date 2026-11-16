"use client"

import { useMemo, useState } from "react"
import { Download, Printer } from "lucide-react"
import { exportFileName, formatCompact, nairobiDay, toCsv } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { DashboardTabs } from "@workspace/ui/components/dashboard/dashboard-tabs"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { PAYOUT_TONE } from "@/components/overview/latest-payout-card"
import { SampleLabel, SampleTag } from "@/components/sample-tag"
import { formatHours, formatKm, sampleTelemetry, shortDay, type SampleDay } from "@/lib/sample-data"
import { formatKes, monthName, PAYOUT_STATUS_LABEL, useDriverPayouts } from "@/lib/use-driver-payouts"

type PeriodKey = "this_week" | "last_week" | "this_month" | "last_month"
type Period = { key: PeriodKey; label: string; from: string; to: string; month: string | null }

const DAY_MS = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const at = (day: string) => Date.parse(`${day}T00:00:00Z`)

/** Calendar weeks (Monday first) and months, in Nairobi days. */
export function reportPeriods(today: string): Period[] {
  const t = at(today)
  const weekday = (new Date(t).getUTCDay() + 6) % 7
  const monday = t - weekday * DAY_MS
  const [y, m] = today.split("-").map(Number) as [number, number]
  const firstOfMonth = Date.UTC(y, m - 1, 1)
  const firstOfLast = Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 11 : m - 2, 1)
  const thisMonth = today.slice(0, 7)
  const lastMonth = iso(firstOfLast).slice(0, 7)
  return [
    { key: "this_week", label: "This week", from: iso(monday), to: today, month: null },
    { key: "last_week", label: "Last week", from: iso(monday - 7 * DAY_MS), to: iso(monday - DAY_MS), month: null },
    { key: "this_month", label: "This month", from: iso(firstOfMonth), to: today, month: thisMonth },
    { key: "last_month", label: "Last month", from: iso(firstOfLast), to: iso(firstOfMonth - DAY_MS), month: lastMonth },
  ]
}

const hoursOrOff = (h: number, d: SampleDay) => (d.logged === 0 ? "Off" : formatHours(h))

const COLUMNS: LedgerColumn<SampleDay>[] = [
  { key: "day", header: "Day", render: (d) => <span className="font-medium">{shortDay(d.day)}</span> },
  { key: "logged", header: "Logged in", align: "right", render: (d) => hoursOrOff(d.logged, d) },
  { key: "driven", header: "Driving", align: "right", render: (d) => hoursOrOff(d.driven, d) },
  { key: "screen", header: "Screen on", align: "right", render: (d) => hoursOrOff(d.hours, d) },
  { key: "km", header: "Distance", align: "right", className: "hidden sm:table-cell", render: (d) => (d.km ? formatKm(d.km) : "—") },
  { key: "plays", header: "Ads shown", align: "right", className: "hidden md:table-cell", render: (d) => (d.plays ? d.plays.toLocaleString("en-KE") : "—") },
  { key: "area", header: "Main area", className: "hidden lg:table-cell", render: (d) => d.area ?? "—" },
]

function HoursBar({ label, value, of }: { label: string; value: number; of: number }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{formatHours(value)}</span>
      </div>
      <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${of > 0 ? (value / of) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

/**
 * A printable summary of one week or month: hours (logged in, driving, screen on), distance,
 * days and ads (Sample until telemetry and shift tracking exist), and the real payouts.
 */
export function ReportsView() {
  const periods = useMemo(() => reportPeriods(nairobiDay(new Date())), [])
  const [key, setKey] = useState<PeriodKey>("this_week")
  const period = periods.find((p) => p.key === key) ?? periods[0]!
  const t = useMemo(() => sampleTelemetry({ from: period.from, to: period.to }), [period.from, period.to])
  const payouts = useDriverPayouts()
  const { totals } = t

  const paidInPeriod = (payouts.data?.items ?? [])
    .filter((p) => p.status === "settled" && p.paidAt && p.paidAt.slice(0, 10) >= period.from && p.paidAt.slice(0, 10) <= period.to)
    .reduce((s, p) => s + p.amountKes, 0)
  const monthPayout = period.month ? payouts.data?.items.find((p) => p.periodMonth === period.month) : undefined
  const screenShare = totals.logged > 0 ? Math.round((totals.hours / totals.logged) * 100) : 0

  function download() {
    const csv = toCsv(
      t.days.map((d) => ({
        day: d.day,
        logged_hours: d.logged,
        driving_hours: d.driven,
        screen_on_hours: d.hours,
        distance_km: d.km,
        ads_shown: d.plays,
        main_area: d.area ?? "",
      })),
      ["day", "logged_hours", "driving_hours", "screen_on_hours", "distance_km", "ads_shown", "main_area"],
    )
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = exportFileName(`driver-report-${period.from}`, null, "csv")
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your hours, distance and pay for a week or a month. Print it, save it as a PDF, or download the days as a
            spreadsheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" className="h-10 gap-2" onClick={download}>
            <Download className="size-4" aria-hidden />
            Download CSV
          </Button>
          <Button className="h-10 gap-2" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Print or save PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="print:hidden">
          <DashboardTabs
            tabs={periods.map((p) => ({ value: p.key, label: p.label }))}
            value={period.key}
            onChange={(v) => setKey(v as PeriodKey)}
          />
        </div>
        <p className="text-sm font-medium">
          {period.label}: {shortDay(period.from)} to {shortDay(period.to)}
        </p>
      </div>

      <KpiStrip
        columns={3}
        items={[
          { label: <SampleLabel>Logged in</SampleLabel>, value: formatHours(totals.logged), note: "Signed in and on shift" },
          { label: <SampleLabel>Driving</SampleLabel>, value: formatHours(totals.driven), note: "Time the car was moving" },
          { label: <SampleLabel>Screen on</SampleLabel>, value: formatHours(totals.hours), note: "Showing ads on your roof" },
          { label: <SampleLabel>Distance</SampleLabel>, value: formatKm(totals.km), note: "Driven with the screen on" },
          { label: <SampleLabel>Days worked</SampleLabel>, value: `${totals.activeDays} of ${t.days.length}`, note: "Days you logged in" },
          { label: <SampleLabel>Ads shown</SampleLabel>, value: formatCompact(totals.plays), note: "Times an ad played on your screen" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard
          className="lg:col-span-2"
          title={<SampleLabel>Your hours</SampleLabel>}
          description="Time logged in, driving and with the screen on"
        >
          {totals.logged > 0 ? (
            <>
              <p className="text-sm font-medium text-pretty">
                Of {formatHours(totals.logged)} logged in, you drove {formatHours(totals.driven)} and your screen was on
                for {formatHours(totals.hours)} ({screenShare}% of your time).
              </p>
              <div className="grid gap-3">
                <HoursBar label="Logged in" value={totals.logged} of={totals.logged} />
                <HoursBar label="Driving" value={totals.driven} of={totals.logged} />
                <HoursBar label="Screen on" value={totals.hours} of={totals.logged} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No hours logged in this period.</p>
          )}
        </DashboardCard>

        <DashboardCard title="Pay" description="Real payouts from Admobi">
          {payouts.isPending ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading payouts">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-40" />
            </div>
          ) : payouts.isError ? (
            <div className="space-y-2" aria-live="polite">
              <p className="text-sm text-muted-foreground">Your payouts didn&apos;t load.</p>
              <Button size="sm" variant="outline" loading={payouts.isFetching} onClick={() => void payouts.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <dl className="grid gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Paid to you in this period</dt>
                <dd className="text-2xl font-semibold tabular-nums">{formatKes(paidInPeriod)}</dd>
              </div>
              {period.month ? (
                <div>
                  <dt className="text-xs text-muted-foreground">{monthName(period.month)} payout</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2">
                    {monthPayout ? (
                      <>
                        <span className="font-medium tabular-nums">{formatKes(monthPayout.amountKes)}</span>
                        <StatusPill tone={PAYOUT_TONE[monthPayout.status] ?? "serious"}>
                          {PAYOUT_STATUS_LABEL[monthPayout.status] ?? monthPayout.status}
                        </StatusPill>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not saved yet. Payouts are added after the month ends.</span>
                    )}
                  </dd>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Admobi pays monthly, so a week usually has no payout of its own.</p>
              )}
            </dl>
          )}
        </DashboardCard>
      </div>

      <LedgerCard
        title={<SampleLabel>Day by day</SampleLabel>}
        description="Every day in the period, oldest first"
        columns={COLUMNS}
        rows={t.days}
        rowKey={(d) => d.day}
        empty="No days in this period yet."
      />

      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <SampleTag />
        Hours, distance and ads are sample figures until your roof screen and shift tracking report. Pay is real.
      </p>
    </div>
  )
}
