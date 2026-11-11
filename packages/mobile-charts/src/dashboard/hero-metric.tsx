import { StyleSheet, Text, View } from "react-native"

import { Sparkline } from "../charts/sparkline"
import type { ChartPalette } from "../palette"
import { SampleTag } from "./sample-tag"
import type { KpiItem } from "./kpi-strip"
import { DeltaPill } from "./delta-pill"

/** The one number a dashboard leads with, with its change and a sparkline. */
export function HeroMetric({
  label,
  value,
  delta,
  sparkline,
  sample,
  palette,
}: {
  label: string
  value: string
  delta?: KpiItem["delta"]
  sparkline?: (number | null)[]
  sample?: boolean
  palette: ChartPalette
}) {
  const compares = delta !== undefined && delta.delta.change !== null
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: palette.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={styles.deltaRow}>
        {delta ? <DeltaPill delta={delta.delta} good={delta.good} format={delta.format} palette={palette} /> : null}
        {compares ? <Text style={[styles.vs, { color: palette.muted }]}>vs last period</Text> : null}
        {sample ? <SampleTag palette={palette} /> : null}
      </View>
      {sparkline ? <Sparkline values={sparkline} palette={palette} height={40} accessibilityLabel={`${label} trend`} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 },
  label: { fontSize: 13 },
  value: { fontSize: 34, fontWeight: "600", fontVariant: ["tabular-nums"] },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  vs: { fontSize: 12 },
})
