import { useWindowDimensions } from "react-native"
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg"
import { StyleSheet, Text, View } from "react-native"

import { BarChart3 } from "@/components/icons"
import { SkeletonBlock } from "@/components/app/skeleton"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type ActivityChartProps = {
  data: Array<{ day: string; count: number }>
  loading?: boolean
  height?: number
}

function formatShortDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("en-KE", { month: "short", day: "numeric" })
}

function formatAxisCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return String(Math.round(value))
}

/** Catmull-Rom to cubic Bezier so the line reads as one smooth curve. */
function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ""
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ")
  }
  let d = `M ${points[0]!.x},${points[0]!.y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]!
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

function normalizeTimeline(
  data: Array<{ day: string; count: number }>,
): Array<{ day: string; count: number }> {
  return data
    .filter((point) => point?.day)
    .map((point) => ({
      day: point.day,
      count: Number.isFinite(point.count) ? Math.max(0, point.count) : 0,
    }))
}

export function ActivityChart({
  data,
  loading,
  height = 120,
}: ActivityChartProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      gap: spacing.sm,
    },
    emptyCard: {
      minHeight: 100,
      justifyContent: "center" as const,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: spacing.sm,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.section,
      color: c.text,
      fontSize: 16,
    },
    subtitle: {
      ...typography.caption,
      color: c.mutedForeground,
    },
    totalBlock: {
      alignItems: "flex-end" as const,
    },
    totalValue: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: c.text,
      letterSpacing: -0.3,
      fontVariant: ["tabular-nums"] as const,
    },
    totalLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "600" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    chartWrap: {
      marginTop: spacing.xs,
      alignItems: "center" as const,
    },
    footer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    footerLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "600" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    footerValue: {
      ...typography.caption,
      color: c.text,
      fontWeight: "600" as const,
    },
    skeletonGap: {
      marginTop: 6,
    },
  }))
  const { width: windowWidth } = useWindowDimensions()
  const chartOuterWidth = Math.max(windowWidth - spacing.lg * 2 - spacing.md * 2, 280)
  const points = normalizeTimeline(data)
  const areaFill = `${colors.primary}24`

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <BarChart3 color={colors.primary} size={18} />
          </View>
          <View style={styles.headerCopy}>
            <SkeletonBlock width={120} height={14} />
            <SkeletonBlock width={80} height={12} style={styles.skeletonGap} />
          </View>
        </View>
        <SkeletonBlock width="100%" height={height} borderRadius={12} />
      </View>
    )
  }

  if (points.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <BarChart3 color={colors.primary} size={18} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Submissions over time</Text>
            <Text style={styles.subtitle}>No activity in this period</Text>
          </View>
        </View>
      </View>
    )
  }

  const width = chartOuterWidth
  const padding = { top: 12, right: 8, bottom: 22, left: 30 }
  const chartHeight = height
  const chartWidth = width - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom

  const maxCount = Math.max(...points.map((d) => d.count), 1)
  const total = points.reduce((sum, d) => sum + d.count, 0)
  const peak = points.reduce(
    (best, point) => (point.count > best.count ? point : best),
    points[0]!,
  )

  const plotPoints = points.map((point, index) => {
    const x =
      padding.left +
      (index / Math.max(points.length - 1, 1)) * chartWidth
    const y =
      padding.top +
      plotHeight -
      (point.count / maxCount) * plotHeight
    return { x, y, count: point.count, day: point.day }
  })

  const peakPoint = plotPoints.find((p) => p.day === peak.day && p.count === peak.count)

  const curvePath = smoothPath(plotPoints)
  const areaPath = [
    curvePath,
    `L ${padding.left + chartWidth},${padding.top + plotHeight}`,
    `L ${padding.left},${padding.top + plotHeight}`,
    "Z",
  ].join(" ")

  const yAxisTicks = [0, 0.5, 1].map((fraction) => ({
    y: padding.top + plotHeight * (1 - fraction),
    value: maxCount * fraction,
  }))

  const gridLines = [0.25, 0.5, 0.75].map(
    (fraction) => padding.top + plotHeight * (1 - fraction),
  )

  const xAxisLabelIndexes = Array.from(
    new Set([0, Math.round((points.length - 1) / 2), points.length - 1]),
  )

  const rangeLabel =
    points.length > 1
      ? `${formatShortDate(points[0]!.day)} – ${formatShortDate(points[points.length - 1]!.day)}`
      : formatShortDate(points[0]!.day)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <BarChart3 color={colors.primary} size={18} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Submissions over time</Text>
          <Text style={styles.subtitle}>{rangeLabel}</Text>
        </View>
        <View style={styles.totalBlock}>
          <Text style={styles.totalValue}>{total}</Text>
          <Text style={styles.totalLabel}>total</Text>
        </View>
      </View>

      <View style={styles.chartWrap}>
        <Svg width={width} height={chartHeight}>
          {gridLines.map((y, index) => (
            <Line
              key={`grid-${index}`}
              x1={padding.left}
              y1={y}
              x2={padding.left + chartWidth}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {yAxisTicks.map((tick, index) => (
            <SvgText
              key={`y-label-${index}`}
              x={padding.left - 6}
              y={tick.y + 3}
              fontSize={9}
              fill={colors.mutedForeground}
              textAnchor="end"
            >
              {formatAxisCount(tick.value)}
            </SvgText>
          ))}
          {xAxisLabelIndexes.map((pointIndex, index) => {
            const point = plotPoints[pointIndex]
            if (!point) return null
            const isFirst = index === 0
            const isLast = index === xAxisLabelIndexes.length - 1
            const textAnchor = isFirst ? "start" : isLast ? "end" : "middle"
            return (
              <SvgText
                key={`x-label-${pointIndex}`}
                x={point.x}
                y={chartHeight - 6}
                fontSize={9}
                fill={colors.mutedForeground}
                textAnchor={textAnchor}
              >
                {formatShortDate(point.day)}
              </SvgText>
            )
          })}
          <Path d={areaPath} fill={areaFill} />
          <Path
            d={curvePath}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {peakPoint ? (
            <Circle
              cx={peakPoint.x}
              cy={peakPoint.y}
              r={4}
              fill={colors.primary}
            />
          ) : null}
        </Svg>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Peak day</Text>
        <Text style={styles.footerValue}>
          {formatShortDate(peak.day)} · {peak.count} submissions
        </Text>
      </View>
    </View>
  )
}

/** @deprecated Use ActivityChart */
export const Sparkline = ActivityChart
