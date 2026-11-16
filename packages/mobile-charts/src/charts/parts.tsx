import { StyleSheet, Text, View } from "react-native"

import type { ChartPalette } from "../palette"

export const seriesColor = (palette: ChartPalette, i: number): string =>
  palette.series[i % palette.series.length] ?? palette.text

/** Dot, name and value rows under a chart. Always on screen, so nothing depends on a tap. */
export function Legend({
  items,
  palette,
}: {
  items: { label: string; value?: string; color: string }[]
  palette: ChartPalette
}) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={[styles.legendLabel, { color: palette.text }]} numberOfLines={1}>
            {item.label}
          </Text>
          {item.value ? <Text style={[styles.legendValue, { color: palette.muted }]}>{item.value}</Text> : null}
        </View>
      ))}
    </View>
  )
}

/** The mobile stand-in for a hover tooltip: the tapped point's values on one line above the chart. */
export function ValueRow({ title, parts, palette }: { title: string; parts: string[]; palette: ChartPalette }) {
  return (
    <Text style={[styles.valueRow, { color: palette.text }]} numberOfLines={2}>
      <Text style={{ color: palette.muted }}>{title}  </Text>
      {parts.join("   ")}
    </Text>
  )
}

const styles = StyleSheet.create({
  legend: { gap: 6, marginTop: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13 },
  legendValue: { fontSize: 13, fontVariant: ["tabular-nums"] },
  valueRow: { fontSize: 12, marginBottom: 6, fontVariant: ["tabular-nums"] },
})
