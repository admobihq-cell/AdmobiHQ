"use client"

import Link from "next/link"
import { formatCompact, formatKes } from "@workspace/ops-contracts"

import { Card, CardContent } from "@workspace/ui/components/card"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { FunnelBars } from "@workspace/ui/components/charts/funnel-bars"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { ActionQueue, type ActionItem } from "@workspace/ui/components/dashboard/action-queue"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { HeroMetric } from "@workspace/ui/components/dashboard/hero-metric"
import { KpiStrip, type KpiItem } from "@workspace/ui/components/dashboard/kpi-strip"
import { percentOrDash, waiting } from "@/components/dashboards/format"
import { monthLabel } from "@/components/finances/overview-tab"
import type { FleetDashboardDto } from "@/lib/queries/fleet-analytics"

const NO_PAYOUTS = "Payouts appear here once they are recorded."

export function FleetDashboard({ data }: { data: FleetDashboardDto }) {
  const { money } = data
  const items: KpiItem[] = [
    { label: "Pending applications", value: String(data.pendingApplications), note: "Waiting for a decision" },
    { label: "Approval rate", value: percentOrDash(data.approvalRate), note: "Approved ÷ (approved + rejected)" },
    { label: "Avg active vehicles", value: data.avgActiveVehicles === null ? "—" : String(data.avgActiveVehicles), note: "Per day with delivery" },
    { label: "Vehicle hours", value: formatCompact(data.vehicleHours), note: "Time on the road in the period" },
    ...(money ? [{ label: "Payouts pending", value: formatKes(money.payoutsPendingKes), note: "Owed to drivers, not yet paid" }] : []),
  ]

  const attention: ActionItem[] = [
    ...data.queue.map((q) => ({
      title: q.name,
      meta: `${q.city ?? "No city"} · waiting ${waiting(q.waitingHours)}`,
      action: "Review",
      tag: q.waitingHours >= 168 ? { label: "Overdue", tone: "serious" as const } : q.waitingHours >= 72 ? { label: "Waiting", tone: "warning" as const } : undefined,
      href: `/driver-applications/${q.id}`,
    })),
    ...(money?.failedPayouts ?? []).map((p) => ({
      title: `${p.driverName}: ${formatKes(p.amountKes)}`,
      meta: `Failed payout for ${monthLabel(p.period)}`,
      action: "Open drivers",
      tag: { label: "Failed", tone: "serious" as const },
      href: "/drivers",
    })),
  ]
  const months = (money?.payoutsByMonth ?? []).map((m) => ({ period: monthLabel(m.period), settled: m.settledKes, pending: m.pendingKes, failed: m.failedKes }))

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent>
            <HeroMetric label="Active drivers" value={String(data.activeDrivers)} note={`Of ${data.totalDrivers} drivers in the CRM`} />
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <KpiStrip items={items} columns={Math.min(5, items.length) as 4 | 5} className="h-full" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Application funnel"
          description="Applications started in the period, and how far they got"
          isEmpty={data.funnel[0]?.value === 0}
          emptyMessage="No applications were started in this period."
          table={{ columns: ["Step", "Applications"], rows: data.funnel.map((f) => [f.label, f.value]) }}
        >
          <FunnelBars steps={data.funnel} />
        </ChartCard>
        <ChartCard
          title="Drivers by city"
          description="Drivers in the CRM"
          isEmpty={data.driversByCity.length === 0}
          emptyMessage="Drivers appear here once they sign up."
          table={{ columns: ["City", "Drivers"], rows: data.driversByCity.map((c) => [c.name, c.value]) }}
        >
          <RankBars data={data.driversByCity} />
        </ChartCard>
        <ChartCard
          title="Active vehicles"
          description="The busiest time of day per campaign, summed across campaigns"
          isEmpty={data.vehiclesTrend.every((p) => p.vehicles === 0)}
          emptyMessage="Vehicle counts appear here once campaigns are reporting."
          table={{ columns: ["Day", "Vehicles"], rows: data.vehiclesTrend.map((p) => [p.day, Number(p.vehicles)]) }}
        >
          <TrendChart data={data.vehiclesTrend} series={[{ key: "vehicles", label: "Vehicles" }]} />
        </ChartCard>
      </div>

      {money ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Payouts by month"
            description="Value by status for the months in the period"
            isEmpty={months.length === 0}
            emptyMessage={NO_PAYOUTS}
            table={{ columns: ["Month", "Settled", "Pending", "Failed"], rows: months.map((m) => [m.period, m.settled, m.pending, m.failed]) }}
          >
            <TrendChart xKey="period" stacked data={months} series={[{ key: "settled", label: "Settled" }, { key: "pending", label: "Pending" }, { key: "failed", label: "Failed" }]} valueFormatter={formatCompact} />
          </ChartCard>
          <ChartCard
            title="Top drivers"
            description="Settled payouts in the period"
            isEmpty={money.topDrivers.length === 0}
            emptyMessage={NO_PAYOUTS}
            table={{ columns: ["Driver", "KES"], rows: money.topDrivers.map((d) => [d.name, d.value]) }}
          >
            <RankBars data={money.topDrivers} valueFormatter={formatKes} />
          </ChartCard>
        </div>
      ) : null}

      <DashboardCard title="Fleet attention" description="Applications waiting longest first, then failed payouts">
        <ActionQueue items={attention.slice(0, 10)} empty="Nothing needs attention." LinkComponent={Link} />
      </DashboardCard>
    </div>
  )
}
