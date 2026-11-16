import { View } from "react-native"
import Svg, { Path } from "react-native-svg"

import { linePath } from "../geometry"
import type { ChartPalette } from "../palette"
import { useWidth } from "./use-width"

/** A tiny trend line with no axes. Draws nothing when there is no number to draw. */
export function Sparkline({
  values,
  palette,
  height = 32,
  color,
  accessibilityLabel,
}: {
  values: readonly (number | null)[]
  palette: ChartPalette
  height?: number
  color?: string
  accessibilityLabel?: string
}) {
  const { width, onLayout } = useWidth()
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (finite.length === 0) return null

  const pad = 3
  const d = width > 0 ? linePath(values, width - pad * 2, height - pad * 2, Math.min(...finite), Math.max(...finite)) : ""
  return (
    <View onLayout={onLayout} style={{ height }} accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? "Trend"}>
      <Svg width={width} height={height}>
        <Path
          d={d}
          transform={`translate(${pad},${pad})`}
          stroke={color ?? palette.series[0]}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  )
}
