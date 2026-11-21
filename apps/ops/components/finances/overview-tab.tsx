"use client"

import Link from "next/link"
import { ArrowDownCircle, ArrowDownToLine, Landmark, PiggyBank, Truck, Wrench } from "lucide-react"
import { financeFlow, formatCompact, formatKes } from "@workspace/ops-contracts"

import { Card, CardContent } from "@workspace/ui/components/card"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { ColumnChart } from "@workspace/ui/components/charts/column-chart"
import { DonutChart } from "@workspace/ui/components/charts/donut-chart"
import { MirrorBars } from "@workspace/ui/components/charts/mirror-bars"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { SankeyChart } from "@workspace/ui/components/charts/sankey-chart"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { HeroMetric } from "@workspace/ui/components/dashboard/hero-metric"
import { CountUp } from "@workspace/ui/components/dashboard/count-up"
import { StatList } from "@workspace/ui/components/dashboard/stat-list"
import { InsightNote } from "@workspace/ui/components/dashboard/notes"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { usePaystackBalance } from "@/components/finances/paystack-balance-tile"
import { RefundDialog } from "@/components/finances/refund-dialog"
import type { FinanceOverviewDto, RecordOptionsDto } from "@/lib/queries/finance"

export const NO_LEDGER = "Transactions appear here once an advertiser's wallet has activity."

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** "2026-11" → "Nov 26". */
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1] ?? m} ${m.slice(2, 4)}`

export function OverviewTab({ data, orgs }: { data: FinanceOverviewDto; orgs: RecordOptionsDto["orgs"] }) {
  const flow = data.moneyInOut.map((r) => ({ period: monthLabel(r.period), in: r.inKes, out: r.outKes }))
  const margin = data.revenue.current > 0 ? Math.round((data.netMarginKes / data.revenue.current) * 100) : null
  const cashFlow = financeFlow({
    revenueByCategory: data.revenueByCategory,
    payoutsKes: data.payoutsKes,
    feesKes: data.feesKes,
    toolCostsKes: data.toolCostsKes,
  })
  const costs = data.payoutsKes + data.feesKes + data.toolCostsKes
  const kept = data.revenue.current > 0 ? Math.round(((data.revenue.current - costs) / data.revenue.current) * 100) : null
  const paystackBalance = usePaystackBalance()
  // Long ranges come back by month ("2026-03"); label those "Mar 26".
  // A finance overview cached before `trend` existed has none: render an empty chart, not a crash.
  const trend = data.trend ?? { granularity: "day" as const, points: [] }
  const trendPoints = trend.points.map((p) => ({
    ...p,
    day: trend.granularity === "month" ? monthLabel(p.day) : p.day,
  }))

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="relative overflow-hidden shadow-xs xl:col-span-2">
          {/* A soft brand wash behind the headline figure. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
          />
          <CardContent className="relative flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <HeroMetric
                label="Revenue"
                value={formatKes(data.revenue.current)}
                deltas={[{ label: "vs previous period", delta: data.revenue, good: "up" }]}
                note="Spend net of refunds, tax left out"
              />
              <div className="flex flex-col items-end gap-1 text-right">
                <p className="text-sm font-medium text-muted-foreground">Net margin</p>
                <p className="text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
                  <CountUp value={formatKes(data.netMarginKes)} />
                </p>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
                    margin === null
                      ? "bg-muted text-muted-foreground"
                      : margin >= 0
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  )}
                >
                  {margin === null ? "No revenue yet" : `${margin}% of revenue`}
                </span>
              </div>
            </div>

            <ColumnChart
              data={trendPoints}
              series={[{ key: "revenue", label: "Revenue" }]}
              valueFormatter={formatKes}
              className="h-44"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { icon: <Truck />, label: "Driver payouts", value: formatKes(data.payoutsKes), note: "Settled in the period" },
                {
                  icon: <Wrench />,
                  label: "Tools and Paystack fees",
                  value: formatKes(data.toolCostsKes + data.feesKes),
                  note: `Tools at run-rate, plus ${formatKes(data.feesKes)} in fees`,
                },
              ].map((tile) => (
                <div key={tile.label} className="@container flex gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-foreground/80 [&>svg]:size-4"
                    aria-hidden
                  >
                    {tile.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{tile.label}</p>
                    <p className="font-semibold whitespace-nowrap tabular-nums @[14rem]:text-lg">
                      <CountUp value={tile.value} />
                    </p>
                    <p className="text-xs text-muted-foreground">{tile.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <DashboardCard title="Cash position" description="What came in, and what's sitting where">
          <StatList
            rows={[
              {
                icon: <ArrowDownToLine />,
                label: "Money in (top-ups)",
                value: formatKes(data.moneyIn.current),
                delta: { delta: data.moneyIn, good: "up" },
                series: trendPoints.map((p) => ({ day: p.day, value: p.moneyIn })),
              },
              {
                icon: <PiggyBank />,
                label: "Wallet funds held",
                value: formatKes(data.fundsHeldKes),
                note: "Owed to advertisers, all time. Not revenue",
              },
              {
                icon: <Landmark />,
                label: "Paystack transfer balance",
                value: paystackBalance,
                note: "Funds driver payouts",
              },
            ]}
          />
        </DashboardCard>
      </div>

      <ChartCard
        title="Where revenue went"
        description="Revenue by category, then what it paid for: driver payouts, Paystack fees, tools, and what was left"
        takeaway={
          kept === null
            ? undefined
            : kept >= 0
              ? `KES ${kept} of every 100 earned was kept as margin.`
              : `Costs ran ${formatKes(costs - data.revenue.current)} over revenue in this period.`
        }
        isEmpty={cashFlow.links.length === 0}
        emptyMessage={NO_LEDGER}
        table={{
          columns: ["From", "To", "KES"],
          rows: cashFlow.links.map((l) => [cashFlow.nodes[l.source]!.name, cashFlow.nodes[l.target]!.name, l.value]),
        }}
      >
        <SankeyChart graph={cashFlow} valueFormatter={formatCompact} />
      </ChartCard>

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
