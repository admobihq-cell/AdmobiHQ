import { StyleSheet, Text, View } from "react-native"
import type { Delta } from "@workspace/ops-contracts"

import { withAlpha } from "../color"
import { deltaView, type DeltaGood } from "../delta"
import type { ChartPalette } from "../palette"
import { deltaColor } from "./tones"

const ARROW = { up: "▲", down: "▼", flat: "–" } as const

/**
 * Change against the previous period. The arrow and the words carry the meaning, colour only
 * reinforces it. Renders nothing when there is nothing to compare, rather than a misleading 0%.
 */
export function DeltaPill({
  delta,
  good,
  format,
  palette,
}: {
  delta: Delta
  good: DeltaGood
  format?: (change: number) => string
  palette: ChartPalette
}) {
  const view = deltaView(delta, good, format)
  if (!view) return null
  const color = deltaColor(palette, view.tone)
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.12) }]} accessibilityLabel={view.label}>
      <Text style={[styles.text, { color }]}>
        {ARROW[view.direction]} {view.text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
})
