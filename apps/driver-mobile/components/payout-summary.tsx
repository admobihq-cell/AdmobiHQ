import { ChartCard, KpiStrip, StackedBars } from "@workspace/mobile-charts"
import { payoutMonthBars, payoutTakeaway } from "@workspace/ops-contracts"

import { SkeletonBlock } from "@/components/app/skeleton"
import { useChartPalette } from "@/lib/chart-palette"
import { formatKes, formatPayoutDate, useDriverPayouts } from "@/lib/driver-payouts"
import { radius } from "@/lib/theme"

/** Paid this year, on its way, last payout: the three numbers a driver checks, in one card. Real figures only. */
export function PayoutKpis() {
  const palette = useChartPalette()
  const { data } = useDriverPayouts()

  if (!data) return <SkeletonBlock height={88} borderRadius={radius.xl} />
  const { summary } = data
  return (
    <KpiStrip
      palette={palette}
      columns={3}
      items={[
        { label: "Paid this year", value: formatKes(summary.paidThisYearKes) },
        { label: "On its way", value: formatKes(summary.pendingKes) },
        {
          label: "Last payout",
          value: summary.lastPayout ? formatKes(summary.lastPayout.amountKes) : "None yet",
          note: summary.lastPayout ? formatPayoutDate(summary.lastPayout.paidAt) : undefined,
        },
      ]}
    />
  )
}

/** Payouts by month for the last twelve months that had one, stacked paid / on its way / didn't go through. */
export function PayoutMonthsChart() {
  const palette = useChartPalette()
  const { data } = useDriverPayouts()

  if (!data) return <SkeletonBlock height={220} borderRadius={radius.xl} />
  const bars = payoutMonthBars(data.items)
  return (
    <ChartCard
      title="Payouts by month"
      description="Tap a bar to see its amounts"
      takeaway={payoutTakeaway(data.items)}
      isEmpty={bars.length === 0}
      emptyMessage="Your monthly payouts will chart here once the first one is saved."
      palette={palette}
    >
      <StackedBars
        bars={bars}
        keys={[
          { key: "paid", label: "Paid" },
          { key: "onItsWay", label: "On its way" },
          { key: "failed", label: "Didn't go through" },
        ]}
        format={(v) => formatKes(v)}
        palette={palette}
      />
    </ChartCard>
  )
}
