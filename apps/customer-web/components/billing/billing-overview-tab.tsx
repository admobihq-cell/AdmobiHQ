"use client"

import { Landmark, Lock, Receipt, Wallet } from "lucide-react"
import { formatKes, type FinanceSummaryDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { DonutChart } from "@workspace/ui/components/charts/donut-chart"
import { MirrorBars } from "@workspace/ui/components/charts/mirror-bars"
import { ShareBar } from "@workspace/ui/components/charts/share-bar"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { AlertStrip } from "@workspace/ui/components/dashboard/notes"
import { BillingPanels } from "@/components/billing/billing-panels"
import type { RangeParams } from "@/lib/analytics-client"

export const NO_LEDGER_MESSAGE = "Your transactions appear here after your first top-up."

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-11" → "Nov 26". */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-")
  return `${MONTHS[Number(m) - 1] ?? month} ${String(year).slice(2)}`
}

export function BillingOverviewTab({
  summary,
  range,
  onTopUp,
  onNavigate,
}: {
  summary: FinanceSummaryDto
  range: RangeParams
  onTopUp: () => void
  onNavigate: (tab: string) => void
}) {
  const { hasLedgerRows } = summary
  const spendEmpty = hasLedgerRows ? "No spending in this period." : NO_LEDGER_MESSAGE
  const spendTotal = summary.spendByCategory.reduce((sum, row) => sum + row.value, 0)
  const campaignTotal = summary.spendByCampaign.reduce((sum, row) => sum + row.value, 0)
  const flow = summary.moneyInOut.map((row) => ({ period: monthLabel(row.period), in: row.inKes, out: row.outKes }))

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <KpiStrip
          columns={2}
          className="self-start"
          items={[
            {
              label: "Balance",
              value: formatKes(summary.balanceKes),
              note: "All time, whatever range is selected",
              icon: <Wallet />,
            },
            {
              label: "Available",
              value: summary.availableKes === null ? "—" : formatKes(summary.availableKes),
              note: summary.availableKes === null ? "Appears after your first top-up" : "Balance minus committed",
              icon: <Landmark />,
            },
            {
              label: "Spent",
              value: formatKes(summary.spentKes.current),
              note: "In the selected period",
              delta: { delta: summary.spentKes, good: "neutral" },
              icon: <Receipt />,
            },
            {
              label: "Committed",
              value: formatKes(summary.committedKes),
              note: "Left on live and scheduled budgets",
              icon: <Lock />,
            },
          ]}
        />
        <div className="grid content-start gap-3">
          <ChartCard
            title="Where your money went"
            description="Share of spend in the selected period"
            isEmpty={spendTotal <= 0}
            emptyMessage={spendEmpty}
            table={{
              columns: ["Category", "KES"],
              rows: summary.spendByCategory.map((row) => [row.name, row.value]),
            }}
          >
            <ShareBar data={summary.spendByCategory} valueFormatter={formatKes} />
          </ChartCard>
          {summary.funding.level === "short" ? (
            <AlertStrip
              title="Your funds are short"
              body={`Your active budgets are ${formatKes(-(summary.availableKes ?? 0))} more than your balance.`}
              action={
                <Button size="sm" onClick={onTopUp}>
                  Top up
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Money in vs out"
          description="Top-ups against spend, by month"
          isEmpty={flow.length === 0}
          emptyMessage={spendEmpty}
          table={{ columns: ["Month", "Money in (KES)", "Money out (KES)"], rows: flow.map((r) => [r.period, r.in, r.out]) }}
        >
          <MirrorBars
            data={flow}
            up={{ key: "in", label: "Top-ups" }}
            down={{ key: "out", label: "Spend" }}
            valueFormatter={formatKes}
          />
        </ChartCard>
        <ChartCard
          title="Spend by campaign"
          description="Share of spend in the selected period"
          isEmpty={campaignTotal <= 0}
          emptyMessage={spendEmpty}
          table={{ columns: ["Campaign", "KES"], rows: summary.spendByCampaign.map((r) => [r.name, r.value]) }}
        >
          <DonutChart
            data={summary.spendByCampaign}
            centerLabel={{ label: "Spent", value: formatKes(campaignTotal) }}
            valueFormatter={formatKes}
          />
        </ChartCard>
      </div>

      <BillingPanels summary={summary} range={range} onTopUp={onTopUp} onNavigate={onNavigate} />
    </div>
  )
}
