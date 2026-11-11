import { View } from "react-native"
import type { NamedValue } from "@workspace/ops-contracts"

import type { ChartPalette } from "../palette"
import { Legend, seriesColor } from "./parts"

/** One bar split by share, with a legend of percentages. Renders nothing when there is no value. */
export function ShareBar({
  data,
  palette,
  accessibilityLabel,
}: {
  data: NamedValue[]
  palette: ChartPalette
  accessibilityLabel?: string
}) {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0)
  if (total <= 0) return null

  const shown = data.map((d, i) => ({ ...d, i })).filter((d) => d.value > 0)
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? shown.map((d) => `${d.name} ${Math.round((d.value / total) * 100)}%`).join(", ")}
    >
      <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" }}>
        {shown.map((d) => (
          <View key={d.name} style={{ flex: d.value, backgroundColor: seriesColor(palette, d.i) }} />
        ))}
      </View>
      <Legend
        palette={palette}
        items={shown.map((d) => ({
          label: d.name,
          color: seriesColor(palette, d.i),
          value: `${Math.round((d.value / total) * 100)}%`,
        }))}
      />
    </View>
  )
}
