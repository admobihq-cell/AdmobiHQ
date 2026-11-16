import { StyleSheet, Text, View } from "react-native"
import { formatCompact, type NamedValue } from "@workspace/ops-contracts"

import type { ChartPalette } from "../palette"
import { seriesColor } from "./parts"

/**
 * Ranked rows: name on the left, value on the right, a bar underneath sized against the biggest row (or
 * `max`). Long names truncate to one line so they can't push the value off screen. Renders nothing when
 * there is nothing to rank.
 */
export function RankBars({
  data,
  palette,
  format = formatCompact,
  max,
  accessibilityLabel,
}: {
  data: NamedValue[]
  palette: ChartPalette
  format?: (value: number) => string
  max?: number
  accessibilityLabel?: string
}) {
  const top = max ?? Math.max(0, ...data.map((d) => d.value))
  if (data.length === 0 || !(top > 0)) return null

  return (
    <View
      style={styles.list}
      accessibilityRole="list"
      accessibilityLabel={accessibilityLabel ?? data.map((d) => `${d.name} ${format(d.value)}`).join(", ")}
    >
      {data.map((d) => {
        const pct = Math.max(0, Math.min(100, (d.value / top) * 100))
        return (
          <View key={d.name} style={styles.row}>
            <View style={styles.head}>
              <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                {d.name}
              </Text>
              <Text style={[styles.value, { color: palette.muted }]}>{format(d.value)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: palette.grid }]}>
              <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: seriesColor(palette, 0) }} />
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { gap: 4 },
  head: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  name: { flex: 1, fontSize: 13 },
  value: { fontSize: 13, fontVariant: ["tabular-nums"] },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
})
