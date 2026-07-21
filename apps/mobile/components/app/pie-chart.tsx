import Svg, { G, Path } from "react-native-svg"
import { StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/lib/theme"

export type PieSlice = {
  name: string
  value: number
  color: string
}

type PieChartProps = {
  slices: PieSlice[]
  size?: number
  innerRadius?: number
  outerRadius?: number
  centerLabel?: string
  centerValue?: string | number
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDegrees: number,
) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  }
}

function describeDonutSlice(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle - startAngle >= 359.99) {
    endAngle = startAngle + 359.99
  }

  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle)
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle)
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle)
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ")
}

export function PieChart({
  slices,
  size = 200,
  innerRadius = 52,
  outerRadius = 88,
  centerLabel = "total",
  centerValue,
}: PieChartProps) {
  const cx = size / 2
  const cy = size / 2
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const displayTotal = centerValue ?? total

  if (total <= 0 || slices.length === 0) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <View style={[styles.emptyRing, { width: size, height: size, borderRadius: size / 2 }]} />
        <View style={styles.center}>
          <Text style={styles.centerValue}>0</Text>
          <Text style={styles.centerLabel}>{centerLabel}</Text>
        </View>
      </View>
    )
  }

  let cursor = 0
  const arcs = slices.map((slice) => {
    const sweep = (slice.value / total) * 360
    const startAngle = cursor
    const endAngle = cursor + sweep
    cursor = endAngle

    return {
      ...slice,
      path: describeDonutSlice(cx, cy, innerRadius, outerRadius, startAngle, endAngle),
    }
  })

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G>
          {arcs.map((arc) => (
            <Path key={arc.name} d={arc.path} fill={arc.color} />
          ))}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerValue}>{displayTotal}</Text>
        <Text style={styles.centerLabel}>{centerLabel}</Text>
      </View>
    </View>
  )
}

type PieLegendProps = {
  slices: PieSlice[]
  total: number
}

export function PieLegend({ slices, total }: PieLegendProps) {
  return (
    <View style={styles.legend}>
      {slices.map((slice) => {
        const percent = total > 0 ? Math.round((slice.value / total) * 100) : 0
        return (
          <View key={slice.name} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View style={[styles.swatch, { backgroundColor: slice.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {slice.name}
              </Text>
            </View>
            <View style={styles.legendRight}>
              <Text style={styles.legendValue}>{slice.value}</Text>
              <Text style={styles.legendPercent}>{percent}%</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  centerLabel: {
    ...typography.caption,
    color: colors.mutedForeground,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  emptyRing: {
    borderWidth: 14,
    borderColor: colors.muted,
    position: "absolute",
  },
  legend: {
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  legendLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendLabel: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },
  legendRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  legendValue: {
    ...typography.section,
    fontSize: 14,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  legendPercent: {
    ...typography.caption,
    color: colors.mutedForeground,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    minWidth: 32,
    textAlign: "right",
  },
})
