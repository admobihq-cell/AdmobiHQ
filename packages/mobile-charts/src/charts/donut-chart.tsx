import { View } from "react-native"
import Svg, { Path, Text as SvgText } from "react-native-svg"
import { formatCompact, type NamedValue } from "@workspace/ops-contracts"

import { donutArcs } from "../geometry"
import type { ChartPalette } from "../palette"
import { Legend, seriesColor } from "./parts"

/** A ring of shares with a legend of name, value and percentage. Renders nothing when there is no value. */
export function DonutChart({
  data,
  palette,
  size = 140,
  format = formatCompact,
  centerLabel,
  centerValue,
  accessibilityLabel,
}: {
  data: NamedValue[]
  palette: ChartPalette
  size?: number
  format?: (value: number) => string
  /** Small caption under the total in the middle ("total", "spend"). */
  centerLabel?: string
  /** What to print in the middle. Defaults to the formatted total; pass a compact figure when `format` is long (KES amounts). */
  centerValue?: string
  accessibilityLabel?: string
}) {
  const arcs = donutArcs(
    data.map((d) => d.value),
    size / 2,
    size * 0.16,
  )
  if (arcs.length === 0) return null

  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0)
  return (
    <View
      style={{ alignItems: "center" }}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? data.map((d) => `${d.name} ${format(d.value)}`).join(", ")}
    >
      <Svg width={size} height={size}>
        {arcs.map((a) => (
          <Path key={a.index} d={a.d} fill={seriesColor(palette, a.index)} />
        ))}
        <SvgText x={size / 2} y={size / 2 + (centerLabel ? 0 : 5)} fontSize={18} fontWeight="600" fill={palette.text} textAnchor="middle">
          {centerValue ?? format(total)}
        </SvgText>
        {centerLabel ? (
          <SvgText x={size / 2} y={size / 2 + 16} fontSize={11} fill={palette.muted} textAnchor="middle">
            {centerLabel}
          </SvgText>
        ) : null}
      </Svg>
      <View style={{ alignSelf: "stretch" }}>
        <Legend
          palette={palette}
          items={arcs.map((a) => {
            const d = data[a.index]!
            return {
              label: d.name,
              color: seriesColor(palette, a.index),
              value: `${format(d.value)} · ${Math.round(a.share * 100)}%`,
            }
          })}
        />
      </View>
    </View>
  )
}
