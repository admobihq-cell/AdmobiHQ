import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import {
  ChartCard,
  ChartSkeleton,
  DonutChart,
  HeroMetric,
  KpiStrip,
  KpiStripSkeleton,
  RankBars,
  StackedBars,
} from "@workspace/mobile-charts"
import {
  NO_LEDGER,
  formatCompact,
  formatKes,
  monthLabel,
  netMarginNote,
  type AttentionItemDto,
  type DateRangeKey,
} from "@workspace/ops-contracts"

import { RefundSheet } from "@/components/finances/refund-sheet"
import { SecondaryButton } from "@/components/ui"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import {
  useFinanceAttention,
  useFinanceOverview,
  usePaystackBalance,
  useRecordOptions,
} from "@/lib/use-finance"

/** Money problems first when there are any; an empty list sinks to the foot, as on the web. */
function NeedsAttention({
  items,
  onOpenPayouts,
}: {
  items: AttentionItemDto[]
  onOpenPayouts: () => void
}) {
  const palette = useChartPalette()
  return (
    <ChartCard
      title="Needs attention"
      description="Payment mismatches, payments pending over an hour, failed refunds and failed driver payouts"
      isEmpty={items.length === 0}
      emptyMessage="Nothing needs attention."
      palette={palette}
    >
      <View>
        {items.map((item, i) => {
          const body = (
            <>
              <View style={styles.attentionCopy}>
                <Text style={[styles.attentionLabel, { color: palette.text }]}>{item.label}</Text>
                <Text style={[styles.attentionDetail, { color: palette.muted }]}>{item.detail}</Text>
              </View>
              <Text style={[styles.amount, { color: palette.text }]}>{formatKes(item.amountKes)}</Text>
            </>
          )
          return item.kind === "payout" ? (
            <Pressable
              key={`${item.kind}-${i}`}
              onPress={onOpenPayouts}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}. Open payouts`}
              style={styles.attentionRow}
            >
              {body}
            </Pressable>
          ) : (
            <View key={`${item.kind}-${i}`} style={styles.attentionRow}>
              {body}
            </View>
          )
        })}
      </View>
    </ChartCard>
  )
}

export function OverviewTab({ range, onOpenPayouts }: { range: DateRangeKey; onOpenPayouts: () => void }) {
  const palette = useChartPalette()
  const overview = useFinanceOverview(range)
  const attention = useFinanceAttention()
  const options = useRecordOptions()
  const balance = usePaystackBalance()
  const [refundOpen, setRefundOpen] = useState(false)

  if (overview.isPending) {
    return (
      <View style={styles.stack}>
        <KpiStripSkeleton palette={palette} />
        <ChartSkeleton palette={palette} />
        <ChartSkeleton palette={palette} />
      </View>
    )
  }
  if (overview.isError) {
    return <ApiErrorBanner message={formatOpsError(overview.error, API_URL)} onRetry={() => overview.refetch()} />
  }

  const data = overview.data
  const attentionItems = attention.data ?? []
  const flow = data.moneyInOut.map((r) => ({
    label: monthLabel(r.period),
    segments: [
      { key: "in", value: r.inKes },
      { key: "out", value: r.outKes },
    ],
  }))
  const attentionCard = <NeedsAttention items={attentionItems} onOpenPayouts={onOpenPayouts} />

  return (
    <View style={styles.stack}>
      {attentionItems.length > 0 ? attentionCard : null}

      <HeroMetric
        label="Revenue"
        value={formatKes(data.revenue.current)}
        delta={{ delta: data.revenue, good: "up" }}
        palette={palette}
      />
      <Text style={[styles.note, { color: palette.muted }]}>Spend net of refunds, tax left out</Text>

      <KpiStrip
        palette={palette}
        items={[
          { label: "Money in", value: formatKes(data.moneyIn.current), note: "Top-ups", delta: { delta: data.moneyIn, good: "up" } },
          { label: "Driver payouts", value: formatKes(data.payoutsKes), note: "Settled in the period" },
          {
            label: "Tool costs and fees",
            value: formatKes(data.toolCostsKes + data.feesKes),
            note: `Run-rate tools, plus ${formatKes(data.feesKes)} Paystack fees`,
          },
          { label: "Net margin", value: formatKes(data.netMarginKes), note: netMarginNote(data.netMarginKes, data.revenue.current) },
        ]}
      />

      <KpiStrip
        palette={palette}
        items={[
          { label: "Wallet funds held", value: formatKes(data.fundsHeldKes), note: "Owed to advertisers, all time. This is not revenue" },
          {
            label: "Paystack balance",
            value: balance.data ? formatKes(balance.data.balanceKes) : "–",
            note: balance.isError ? "Couldn't reach Paystack" : balance.isPending ? "Checking…" : "Live balance",
          },
        ]}
      />

      <ChartCard
        title="Money in vs out"
        description="Advertiser top-ups against spend, by month"
        isEmpty={flow.length === 0}
        emptyMessage={NO_LEDGER}
        palette={palette}
      >
        <StackedBars
          bars={flow}
          keys={[
            { key: "in", label: "Top-ups" },
            { key: "out", label: "Spend and refunds" },
          ]}
          format={formatCompact}
          palette={palette}
        />
      </ChartCard>

      <ChartCard
        title="Revenue by category"
        description="Where revenue came from in the period"
        isEmpty={data.revenueByCategory.length === 0}
        emptyMessage={NO_LEDGER}
        palette={palette}
      >
        <DonutChart
          data={data.revenueByCategory}
          centerLabel="Revenue"
          centerValue={formatCompact(data.revenue.current)}
          format={formatKes}
          palette={palette}
        />
      </ChartCard>

      <ChartCard
        title="Revenue by market"
        description="The market of the campaign that was charged"
        isEmpty={data.revenueByMarket.length === 0}
        emptyMessage={NO_LEDGER}
        palette={palette}
      >
        <RankBars data={data.revenueByMarket} format={formatKes} palette={palette} />
      </ChartCard>

      <ChartCard title="Margin" description="How net margin is worked out" isEmpty={false} emptyMessage="" palette={palette}>
        <View style={styles.marginCard}>
          <Text style={[styles.note, { color: palette.muted }]}>
            Net margin is revenue, less driver payouts settled in the period, less Paystack fees (absorbed, never passed on),
            less tool costs. Tool costs are today&rsquo;s monthly run-rate scaled to the period, because the integrations list
            keeps no history.
          </Text>
          <SecondaryButton label="New payout run" onPress={onOpenPayouts} />
          <SecondaryButton label="Refund" onPress={() => setRefundOpen(true)} disabled={!options.data} />
        </View>
      </ChartCard>

      {attentionItems.length === 0 ? attentionCard : null}

      <RefundSheet visible={refundOpen} onClose={() => setRefundOpen(false)} orgs={options.data?.orgs ?? []} />
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  note: { fontSize: 12, lineHeight: 17 },
  marginCard: { gap: 8 },
  attentionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, minHeight: 44, paddingVertical: 6 },
  attentionCopy: { flex: 1, gap: 2 },
  attentionLabel: { fontSize: 14, fontWeight: "600" },
  attentionDetail: { fontSize: 12 },
  amount: { fontSize: 14, fontVariant: ["tabular-nums"] },
})
