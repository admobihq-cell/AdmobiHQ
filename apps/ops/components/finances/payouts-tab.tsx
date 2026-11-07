"use client"

import { useState } from "react"
import { formatCompact, formatKes } from "@workspace/ops-contracts"

import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { SegmentGauge } from "@workspace/ui/components/charts/segment-gauge"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { monthLabel } from "@/components/finances/overview-tab"
import type { FinancePayoutsDto, PayoutRowDto } from "@/lib/queries/finance"

const NO_PAYOUTS = "Driver payouts appear here once they are recorded."

const STATUS: Record<string, { label: string; tone: "good" | "warning" | "serious" | "neutral" }> = {
  settled: { label: "Settled", tone: "good" },
  pending: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "serious" },
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "settled", label: "Settled" },
  { value: "failed", label: "Failed" },
]

const COLUMNS: LedgerColumn<PayoutRowDto>[] = [
  { key: "driver", header: "Driver", className: "min-w-40", render: (p) => <span className="font-medium">{p.driverName}</span> },
  { key: "period", header: "Month", render: (p) => monthLabel(p.periodMonth) },
  { key: "amount", header: "Amount", align: "right", render: (p) => formatKes(p.amountKes) },
  {
    key: "status",
    header: "Status",
    render: (p) => {
      const s = STATUS[p.status] ?? { label: p.status, tone: "neutral" as const }
      return <StatusPill tone={s.tone}>{s.label}</StatusPill>
    },
  },
  {
    key: "paid",
    header: "Paid on",
    render: (p) => (p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" }) : "Not paid"),
  },
  { key: "ref", header: "M-Pesa ref", render: (p) => p.mpesaRef ?? "None" },
]

/** Driver payouts: how much has settled, what is stuck, and who is owed. */
export function PayoutsTab({ data }: { data: FinancePayoutsDto }) {
  const [filter, setFilter] = useState("all")
  const amount = (status: string) => data.byStatus.find((s) => s.status === status)?.amountKes ?? 0
  const count = (status: string) => data.byStatus.find((s) => s.status === status)?.count ?? 0
  const total = data.byStatus.reduce((sum, s) => sum + s.amountKes, 0)
  const rows = data.rows.filter((p) => filter === "all" || p.status === filter)
  const months = data.byMonth.map((m) => ({ period: monthLabel(m.period), settled: m.settledKes, pending: m.pendingKes, failed: m.failedKes }))

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard title="Settled" description="Share of payout value that has been paid">
          {total > 0 ? (
            <SegmentGauge value={amount("settled")} max={total} label={`${formatKes(amount("settled"))} of ${formatKes(total)}`} />
          ) : (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{NO_PAYOUTS}</p>
          )}
          <dl className="grid gap-1 text-sm">
            {(["pending", "failed"] as const).map((s) => (
              <div key={s} className="flex justify-between">
                <dt className="text-muted-foreground">{STATUS[s]!.label}</dt>
                <dd className="tabular-nums">
                  {count(s)} · {formatKes(amount(s))}
                </dd>
              </div>
            ))}
          </dl>
        </DashboardCard>
        <ChartCard
          className="lg:col-span-2"
          title="Payouts by month"
          description="Value by status for the months in the period"
          isEmpty={months.length === 0}
          emptyMessage={NO_PAYOUTS}
          table={{ columns: ["Month", "Settled", "Pending", "Failed"], rows: months.map((m) => [m.period, m.settled, m.pending, m.failed]) }}
        >
          <TrendChart
            xKey="period"
            stacked
            data={months}
            series={[
              { key: "settled", label: "Settled" },
              { key: "pending", label: "Pending" },
              { key: "failed", label: "Failed" },
            ]}
            valueFormatter={formatCompact}
          />
        </ChartCard>
      </div>

      <LedgerCard
        title="Payouts"
        description="Driver payouts for the months in the period"
        filterTabs={{
          tabs: FILTERS.map((f) => ({ ...f, count: f.value === "all" ? data.rows.length : data.rows.filter((p) => p.status === f.value).length })),
          value: filter,
          onChange: setFilter,
        }}
        columns={COLUMNS}
        rows={rows}
        rowKey={(p) => String(p.id)}
        footer={{ viewing: `Viewing ${rows.length} out of ${data.rows.length}`, page: 1, pageCount: 1, onPageChange: () => {} }}
        empty={data.rows.length === 0 ? NO_PAYOUTS : "Nothing matches this filter."}
      />
    </div>
  )
}
