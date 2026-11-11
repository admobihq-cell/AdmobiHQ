import { StyleSheet, Text, View } from "react-native"
import { ChartCard, ChartSkeleton, KpiStrip, KpiStripSkeleton, RankBars } from "@workspace/mobile-charts"
import { CATEGORY_LABEL, RATES_AS_OF, USD_KES, formatKes } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { useToolCosts } from "@/lib/use-finance"

/** A run-rate summary of the integrations list. The list itself is edited under Settings. */
export function ToolCostsTab() {
  const palette = useChartPalette()
  const costs = useToolCosts()

  if (costs.isPending) {
    return (
      <View style={styles.stack}>
        <KpiStripSkeleton palette={palette} count={3} />
        <ChartSkeleton palette={palette} />
      </View>
    )
  }
  if (costs.isError) {
    return <ApiErrorBanner message={formatOpsError(costs.error, API_URL)} onRetry={() => costs.refetch()} />
  }

  const data = costs.data
  const byCategory = data.byCategory.map((c) => ({ ...c, name: CATEGORY_LABEL[c.name] ?? c.name }))
  return (
    <View style={styles.stack}>
      <KpiStrip
        palette={palette}
        columns={3}
        items={[
          { label: "Monthly run-rate", value: formatKes(data.monthlyKes), note: "Active and trial tools" },
          { label: "Yearly run-rate", value: formatKes(data.monthlyKes * 12), note: "Twelve times the monthly figure" },
          { label: "Tools counted", value: String(data.activeCount), note: "Active and trial" },
        ]}
      />
      <ChartCard
        title="By category"
        description="Monthly run-rate in KES"
        isEmpty={byCategory.length === 0}
        emptyMessage="Add tools under Settings > Integrations to see their cost here."
        palette={palette}
      >
        <RankBars data={byCategory} format={formatKes} palette={palette} />
      </ChartCard>
      <Text style={[styles.note, { color: palette.muted }]}>
        Free and usage-priced tools count as zero, and canceled or under-review tools are left out. Costs in dollars and euros
        are converted at KES {USD_KES} to the dollar, as of {RATES_AS_OF}.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  note: { fontSize: 12, lineHeight: 17 },
})
