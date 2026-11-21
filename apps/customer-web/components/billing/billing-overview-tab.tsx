"use client"

import { formatCompact, formatKes, spendFlow, type FinanceSummaryDto } from "@workspace/ops-contracts"

import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { DonutChart } from "@workspace/ui/components/charts/donut-chart"
import { MirrorBars } from "@workspace/ui/components/charts/mirror-bars"
import { SankeyChart } from "@workspace/ui/components/charts/sankey-chart"
import { ShareBar } from "@workspace/ui/components/charts/share-bar"
import { FundingStatement, ShortcutsCard, UpcomingChargesCard } from "@/components/billing/billing-panels"
import { leader, pct } from "@/components/reports/takeaways"
import type { RangeParams } from "@/lib/analytics-client"

export const NO_LEDGER_MESSAGE = "Your transactions appear here after your first top-up."

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-11" → "Nov 26". */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-")
  return `${MONTHS[Number(m) - 1] ?? month} ${String(year).slice(2)}`
}

/** Funding first (covered until when, and the money actions), then what's coming, then where it went. */
export function BillingOverviewTab({
  summary,
  range,
  onTopUp,
  onRequestRefund,
}: {
  summary: FinanceSummaryDto
  range: RangeParams
  /** Absent without billing:write. */
  onTopUp?: () => void
  /** Absent without billing:write or with nothing available to refund. */
  onRequestRefund?: () => void
}) {
  const { hasLedgerRows } = summary
  const spendEmpty = hasLedgerRows ? "No spending in this period." : NO_LEDGER_MESSAGE
  const spendTotal = summary.spendByCategory.reduce((sum, row) => sum + row.value, 0)
  const campaignTotal = summary.spendByCampaign.reduce((sum, row) => sum + row.value, 0)
  const moneyFlow = spendFlow({ byCampaign: summary.spendByCampaign, byCategory: summary.spendByCategory })
  const flow = summary.moneyInOut.map((row) => ({ period: monthLabel(row.period), in: row.inKes, out: row.outKes }))

  return (
    <div className="grid gap-4">
      <FundingStatement summary={summary} onTopUp={onTopUp} onRequestRefund={onRequestRefund} />

      <div className="grid gap-4 lg:grid-cols-3">
        <UpcomingChargesCard summary={summary} />
        <ChartCard
          title="Where your money went"
          description="Share of spend in the selected period"
          takeaway={(() => {
            const top = leader(summary.spendByCategory)
            return top ? `${pct(top.share)} of your spend went on ${top.name.toLowerCase()}.` : undefined
          })()}
          isEmpty={spendTotal <= 0}
          emptyMessage={spendEmpty}
          table={{
            columns: ["Category", "KES"],
            rows: summary.spendByCategory.map((row) => [row.name, row.value]),
          }}
        >
          <ShareBar data={summary.spendByCategory} valueFormatter={formatKes} />
        </ChartCard>
        <ShortcutsCard range={range} hasLedgerRows={hasLedgerRows} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Money in vs out"
          description="Top-ups against spend and refunds to you, by month"
          takeaway={(() => {
            const paidIn = flow.reduce((s, r) => s + r.in, 0)
            const paidOut = flow.reduce((s, r) => s + r.out, 0)
            if (paidIn <= 0 && paidOut <= 0) return undefined
            return `Over these months you put in ${formatKes(paidIn)} and used ${formatKes(paidOut)}.`
          })()}
          isEmpty={flow.length === 0}
          emptyMessage={spendEmpty}
          table={{ columns: ["Month", "Money in (KES)", "Money out (KES)"], rows: flow.map((r) => [r.period, r.in, r.out]) }}
        >
          <MirrorBars
            data={flow}
            up={{ key: "in", label: "Top-ups" }}
            down={{ key: "out", label: "Spend and refunds" }}
            valueFormatter={formatKes}
          />
        </ChartCard>
        <ChartCard
          title="Spend by campaign"
          description="Share of spend in the selected period"
          takeaway={(() => {
            const top = leader(summary.spendByCampaign)
            return top ? `${top.name} took ${pct(top.share)} of your spend.` : undefined
          })()}
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

      <ChartCard
        title="Where your money went"
        description="Each campaign's spend, then what it paid for"
        isEmpty={moneyFlow.links.length === 0}
        emptyMessage={spendEmpty}
        table={{
          columns: ["From", "To", "KES"],
          rows: moneyFlow.links.map((l) => [moneyFlow.nodes[l.source]!.name, moneyFlow.nodes[l.target]!.name, l.value]),
        }}
      >
        <SankeyChart graph={moneyFlow} valueFormatter={formatCompact} />
      </ChartCard>
    </div>
  )
}
