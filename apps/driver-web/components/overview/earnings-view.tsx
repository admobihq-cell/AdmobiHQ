"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Download } from "lucide-react"
import { exportFileName, formatCompact, payoutFocus, toCsv, type DriverPayoutDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { KpiStrip, type KpiItem } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { AlertStrip } from "@workspace/ui/components/dashboard/notes"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { KpiStripSkeleton, LedgerSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"

import { LatestPayoutCard, PAYOUT_DETAILS_HREF, PAYOUT_TONE, SUPPORT_HREF } from "@/components/overview/latest-payout-card"
import { formatKes, formatPayoutDate, monthName, PAYOUT_STATUS_LABEL, useDriverPayouts } from "@/lib/use-driver-payouts"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "on_way", label: "On its way" },
  { value: "problem", label: "Problems" },
]
const GROUP: Record<string, string> = { settled: "paid", pending: "on_way", processing: "on_way" }
const groupOf = (p: DriverPayoutDto) => GROUP[p.status] ?? "problem"
const isProblem = (p: DriverPayoutDto) => groupOf(p) === "problem"

/** Last twelve months that have a payout, oldest first, split by where the money is. */
function byMonth(items: DriverPayoutDto[]) {
  const months = new Map<string, { period: string; paid: number; onWay: number }>()
  for (const p of items) {
    const row = months.get(p.periodMonth) ?? { period: p.periodMonth, paid: 0, onWay: 0 }
    if (p.status === "settled") row.paid += p.amountKes
    else if (!isProblem(p)) row.onWay += p.amountKes
    months.set(p.periodMonth, row)
  }
  return [...months.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-12)
    .map((m) => ({ ...m, label: monthName(m.period) }))
}

const columns = (destination: string | null): LedgerColumn<DriverPayoutDto>[] => [
  { key: "month", header: "Month", render: (p) => <span className="font-medium">{monthName(p.periodMonth)}</span> },
  {
    key: "status",
    header: "Status",
    render: (p) => <StatusPill tone={PAYOUT_TONE[p.status] ?? "serious"}>{PAYOUT_STATUS_LABEL[p.status] ?? p.status}</StatusPill>,
  },
  { key: "paid", header: "Paid on", render: (p) => (p.paidAt ? formatPayoutDate(p.paidAt) : "—") },
  { key: "to", header: "To", className: "hidden md:table-cell", render: () => destination ?? "—" },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    render: (p) => (
      <span className={isProblem(p) ? "text-muted-foreground line-through" : "font-medium"}>{formatKes(p.amountKes)}</span>
    ),
  },
]

/** Real payouts only. Screen-on hours and distance live on the dashboard as samples. */
export function EarningsView({ payoutDestination }: { payoutDestination: string | null }) {
  const { data, isError, isFetching, refetch } = useDriverPayouts()
  const [filter, setFilter] = useState("all")
  const items = useMemo(() => data?.items ?? [], [data])
  const rows = useMemo(() => items.filter((p) => filter === "all" || groupOf(p) === filter), [items, filter])
  const months = useMemo(() => byMonth(items), [items])
  const focus = data ? payoutFocus(data) : null
  const year = new Date().getFullYear()

  function download() {
    const csv = toCsv(
      rows.map((p) => ({
        month: p.periodMonth,
        status: PAYOUT_STATUS_LABEL[p.status] ?? p.status,
        paid_on: p.paidAt?.slice(0, 10) ?? "",
        amount_kes: p.amountKes,
      })),
      ["month", "status", "paid_on", "amount_kes"],
    )
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = exportFileName("payouts", null, "csv")
    a.click()
    URL.revokeObjectURL(url)
  }

  const kpis: KpiItem[] = data
    ? [
        { label: `Paid in ${year}`, value: formatKes(data.summary.paidThisYearKes), note: "Settled to you this calendar year" },
        { label: "On its way", value: formatKes(data.summary.pendingKes), note: "Saved or sending, not yet landed" },
        {
          label: "Last payout",
          value: data.summary.lastPayout ? formatKes(data.summary.lastPayout.amountKes) : "—",
          note: data.summary.lastPayout ? `Paid ${formatPayoutDate(data.summary.lastPayout.paidAt)}` : "Nothing paid yet",
        },
        {
          label: "Paid to",
          value: <span className="text-lg">{payoutDestination ?? "Not set"}</span>,
          note: (
            <Link href={PAYOUT_DETAILS_HREF} className="text-primary underline-offset-4 hover:underline">
              {payoutDestination ? "Change payout details" : "Add payout details"}
            </Link>
          ),
        },
      ]
    : []

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Earnings</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every monthly payout Admobi has saved for you, where it is, and where it went.
          </p>
        </div>
        <Button asChild variant="outline" className="h-10">
          <Link href={SUPPORT_HREF}>Question about a payout?</Link>
        </Button>
      </div>

      {isError && !data ? (
        <AlertStrip
          title="Your payouts didn't load"
          body="Your money is safe. This is a connection problem on our side or yours."
          action={
            <Button size="sm" variant="outline" loading={isFetching} loadingText="Trying again…" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      ) : focus?.kind === "problem" ? (
        <AlertStrip
          className="border-destructive/30 bg-destructive/5"
          title={`Your ${monthName(focus.payout.periodMonth)} payout ${focus.payout.status === "reversed" ? "was reversed" : "didn't go through"}`}
          body="Check your M-Pesa number or bank account, then we'll resend. Support can tell you exactly what happened."
          action={
            <Button asChild size="sm">
              <Link href={PAYOUT_DETAILS_HREF}>Check payout details</Link>
            </Button>
          }
        />
      ) : null}

      {data ? <KpiStrip items={kpis} columns={4} /> : isError ? null : <KpiStripSkeleton cells={4} columns={4} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Payouts by month"
          description="Paid and on its way, for the last twelve months with a payout"
          isEmpty={months.length === 0}
          emptyMessage={data ? "Your monthly payouts chart here once the first is saved." : "Loading your payouts…"}
          table={{ columns: ["Month", "Paid (KES)", "On its way (KES)"], rows: months.map((m) => [m.label, m.paid, m.onWay]) }}
        >
          <TrendChart
            xKey="label"
            stacked
            data={months}
            series={[
              { key: "paid", label: "Paid" },
              { key: "onWay", label: "On its way" },
            ]}
            valueFormatter={formatCompact}
          />
        </ChartCard>
        <LatestPayoutCard destination={payoutDestination} />
      </div>

      {data ? (
        <LedgerCard
          title="Payout history"
          description="Newest month first. Amounts struck through didn't reach you."
          filterTabs={{
            tabs: FILTERS.map((f) => ({
              ...f,
              count: f.value === "all" ? items.length : items.filter((p) => groupOf(p) === f.value).length,
            })),
            value: filter,
            onChange: setFilter,
          }}
          toolbar={
            <Button variant="outline" size="sm" className="gap-2" onClick={download} disabled={rows.length === 0}>
              <Download className="size-4" aria-hidden />
              CSV
            </Button>
          }
          columns={columns(payoutDestination)}
          rows={rows}
          rowKey={(p) => String(p.id)}
          empty={
            items.length === 0
              ? "Nothing here yet. Each monthly payout is added the moment Admobi saves it."
              : "No payouts match this filter."
          }
        />
      ) : isError ? null : (
        <LedgerSkeleton rows={4} columns={5} filters />
      )}
    </div>
  )
}
