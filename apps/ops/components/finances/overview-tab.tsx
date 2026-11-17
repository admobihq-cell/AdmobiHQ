"use client"

import Link from "next/link"
import { ArrowDownCircle } from "lucide-react"
import { formatCompact, formatKes } from "@workspace/ops-contracts"

import { Card, CardContent } from "@workspace/ui/components/card"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { DonutChart } from "@workspace/ui/components/charts/donut-chart"
import { MirrorBars } from "@workspace/ui/components/charts/mirror-bars"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { HeroMetric } from "@workspace/ui/components/dashboard/hero-metric"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { MetricTile } from "@workspace/ui/components/dashboard/metric-tile"
import { InsightNote } from "@workspace/ui/components/dashboard/notes"
import { Button } from "@workspace/ui/components/button"
import { PaystackBalanceTile } from "@/components/finances/paystack-balance-tile"
import { RefundDialog } from "@/components/finances/refund-dialog"
import type { FinanceOverviewDto, RecordOptionsDto } from "@/lib/queries/finance"

export const NO_LEDGER = "Transactions appear here once an advertiser's wallet has activity."

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** "2026-11" → "Nov 26". */
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1] ?? m} ${m.slice(2, 4)}`

export function OverviewTab({ data, orgs }: { data: FinanceOverviewDto; orgs: RecordOptionsDto["orgs"] }) {
  const flow = data.moneyInOut.map((r) => ({ period: monthLabel(r.period), in: r.inKes, out: r.outKes }))
  const margin = data.revenue.current > 0 ? Math.round((data.netMarginKes / data.revenue.current) * 100) : null

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent>
            <HeroMetric
              label="Revenue"
              value={formatKes(data.revenue.current)}
              deltas={[{ label: "vs previous period", delta: data.revenue, good: "up" }]}
              note="Spend net of refunds, tax left out"
            />
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:col-span-2">
          <KpiStrip
            columns={4}
            items={[
              { label: "Money in", value: formatKes(data.moneyIn.current), note: "Top-ups", delta: { delta: data.moneyIn, good: "up" } },
              { label: "Driver payouts", value: formatKes(data.payoutsKes), note: "Settled in the period" },
              {
                label: "Tool costs and fees",
                value: formatKes(data.toolCostsKes + data.feesKes),
                note: `Run-rate tools, plus ${formatKes(data.feesKes)} Paystack fees`,
              },
              {
                label: "Net margin",
                value: formatKes(data.netMarginKes),
                note: margin === null ? "No revenue yet" : `${margin}% of revenue`,
              },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricTile
              label="Wallet funds held"
              value={formatKes(data.fundsHeldKes)}
              note="Owed to advertisers, all time. This is not revenue"
            />
            <PaystackBalanceTile />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Money in vs out"
          description="Advertiser top-ups against spend, by month"
          isEmpty={flow.length === 0}
          emptyMessage={NO_LEDGER}
          table={{ columns: ["Month", "Money in (KES)", "Money out (KES)"], rows: flow.map((r) => [r.period, r.in, r.out]) }}
        >
          <MirrorBars data={flow} up={{ key: "in", label: "Top-ups" }} down={{ key: "out", label: "Spend and refunds" }} valueFormatter={formatCompact} />
        </ChartCard>
        <ChartCard
          title="Revenue by category"
          description="Where revenue came from in the period"
          isEmpty={data.revenueByCategory.length === 0}
          emptyMessage={NO_LEDGER}
          table={{ columns: ["Category", "KES"], rows: data.revenueByCategory.map((r) => [r.name, r.value]) }}
        >
          <DonutChart
            data={data.revenueByCategory}
            centerLabel={{ label: "Revenue", value: formatCompact(data.revenue.current) }}
            valueFormatter={formatKes}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue by market"
          description="The market of the campaign that was charged"
          isEmpty={data.revenueByMarket.length === 0}
          emptyMessage={NO_LEDGER}
          table={{ columns: ["Market", "KES"], rows: data.revenueByMarket.map((r) => [r.name, r.value]) }}
        >
          <RankBars data={data.revenueByMarket} valueFormatter={formatKes} />
        </ChartCard>
        <DashboardCard title="Margin" description="How net margin is worked out">
          <InsightNote>
            Net margin is revenue, less driver payouts settled in the period, less Paystack fees (absorbed, never
            passed on), less tool costs. Tool costs are today&rsquo;s monthly run-rate scaled to the period, because
            the integrations list keeps no history.
          </InsightNote>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/finances?tab=payouts">
                <ArrowDownCircle aria-hidden />
                New payout run
              </Link>
            </Button>
            <RefundDialog orgs={orgs} />
          </div>
        </DashboardCard>
      </div>

    </div>
  )
}
