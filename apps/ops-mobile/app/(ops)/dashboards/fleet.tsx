import { useRouter } from "expo-router"
import { ChartCard, HeroMetric, KpiStrip, RankBars, StackedBars, TrendChart } from "@workspace/mobile-charts"
import { formatCompact, formatKes, monthLabel, percentOrDash, waiting, type FleetDashboardDto } from "@workspace/ops-contracts"

import { DashboardScreen, Note, QueueList, type QueueItem } from "@/components/dashboards/dashboard-screen"

const NO_PAYOUTS = "Payouts appear here once they are recorded."

/** The Fleet dashboard. The payout cards and the failed-payout rows exist only when the API sent `money` (needs `finances`). */
export default function FleetDashboardScreen() {
  const router = useRouter()
  return (
    <DashboardScreen<FleetDashboardDto> title="Fleet" permission="drivers" name="fleet" load={(c, range) => c.dashboards.fleet(range)}>
      {(data, palette) => {
        const { money } = data
        const attention: QueueItem[] = [
          ...data.queue.map((q) => ({
            key: `application-${q.id}`,
            title: q.name,
            meta: `${q.city ?? "No city"} · waiting ${waiting(q.waitingHours)}`,
            tag: q.waitingHours >= 168 ? { label: "Overdue", tone: "serious" as const } : q.waitingHours >= 72 ? { label: "Waiting", tone: "warning" as const } : undefined,
            onPress: () => router.push(`/(ops)/driver-applications/${q.id}`),
          })),
          ...(money?.failedPayouts ?? []).map((p) => ({
            key: `payout-${p.id}`,
            title: `${p.driverName}: ${formatKes(p.amountKes)}`,
            meta: `Failed payout for ${monthLabel(p.period)}`,
            tag: { label: "Failed", tone: "serious" as const },
            onPress: () => router.push("/(ops)/drivers"),
          })),
        ].slice(0, 10)

        return (
          <>
            <HeroMetric label="Active drivers" value={String(data.activeDrivers)} palette={palette} />
            <Note palette={palette}>Of {data.totalDrivers} drivers in the CRM</Note>
            <KpiStrip
              palette={palette}
              items={[
                { label: "Pending applications", value: String(data.pendingApplications), note: "Waiting for a decision" },
                { label: "Approval rate", value: percentOrDash(data.approvalRate), note: "Approved ÷ (approved + rejected)" },
                { label: "Avg active vehicles", value: data.avgActiveVehicles === null ? "—" : String(data.avgActiveVehicles), note: "Per day with delivery" },
                { label: "Vehicle hours", value: formatCompact(data.vehicleHours), note: "Time on the road in the period" },
                ...(money ? [{ label: "Payouts pending", value: formatKes(money.payoutsPendingKes), note: "Owed to drivers, not yet paid" }] : []),
              ]}
            />
            <ChartCard
              title="Application funnel"
              description="Applications started in the period, and how far they got"
              isEmpty={!data.funnel[0]?.value}
              emptyMessage="No applications were started in this period."
              palette={palette}
            >
              <RankBars data={data.funnel.map((f) => ({ name: f.label, value: f.value }))} palette={palette} />
            </ChartCard>
            <ChartCard title="Drivers by city" description="Drivers in the CRM" isEmpty={data.driversByCity.length === 0} emptyMessage="Drivers appear here once they sign up." palette={palette}>
              <RankBars data={data.driversByCity} palette={palette} />
            </ChartCard>
            <ChartCard
              title="Active vehicles"
              description="The busiest time of day per campaign, summed across campaigns"
              isEmpty={data.vehiclesTrend.every((p) => p.vehicles === 0)}
              emptyMessage="Vehicle counts appear here once campaigns are reporting."
              palette={palette}
            >
              <TrendChart points={data.vehiclesTrend} series={[{ key: "vehicles", label: "Vehicles" }]} palette={palette} />
            </ChartCard>
            {money ? (
              <>
                <ChartCard
                  title="Payouts by month"
                  description="Value by status for the months in the period"
                  isEmpty={money.payoutsByMonth.length === 0}
                  emptyMessage={NO_PAYOUTS}
                  palette={palette}
                >
                  <StackedBars
                    bars={money.payoutsByMonth.map((m) => ({
                      label: monthLabel(m.period),
                      segments: [
                        { key: "settled", value: m.settledKes },
                        { key: "pending", value: m.pendingKes },
                        { key: "failed", value: m.failedKes },
                      ],
                    }))}
                    keys={[
                      { key: "settled", label: "Settled" },
                      { key: "pending", label: "Pending" },
                      { key: "failed", label: "Failed" },
                    ]}
                    format={formatCompact}
                    palette={palette}
                  />
                </ChartCard>
                <ChartCard title="Top drivers" description="Settled payouts in the period" isEmpty={money.topDrivers.length === 0} emptyMessage={NO_PAYOUTS} palette={palette}>
                  <RankBars data={money.topDrivers} format={formatKes} palette={palette} />
                </ChartCard>
              </>
            ) : null}
            <ChartCard
              title="Fleet attention"
              description="Applications waiting longest first, then failed payouts"
              isEmpty={attention.length === 0}
              emptyMessage="Nothing needs attention."
              palette={palette}
            >
              <QueueList items={attention} palette={palette} />
            </ChartCard>
          </>
        )
      }}
    </DashboardScreen>
  )
}
