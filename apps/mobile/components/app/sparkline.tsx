import Svg, { Path, Polyline } from "react-native-svg"
import { StyleSheet, Text, View } from "react-native"

import { SkeletonBlock } from "@/components/app/skeleton"
import { colors, radius, spacing, typography } from "@/lib/theme"

type SparklineProps = {
  data: Array<{ day: string; count: number }>
  loading?: boolean
  height?: number
}

export function Sparkline({ data, loading, height = 80 }: SparklineProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonBlock width="100%" height={height} borderRadius={radius.md} />
      </View>
    )
  }

  if (data.length === 0) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>No activity in this period</Text>
      </View>
    )
  }

  const width = 300
  const padding = 8
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const points = data.map((point, index) => {
    const x =
      padding +
      (index / Math.max(data.length - 1, 1)) * (width - padding * 2)
    const y =
      height - padding - (point.count / maxCount) * (height - padding * 2)
    return `${x},${y}`
  })

  const areaPath = [
    `M ${padding},${height - padding}`,
    ...points.map((p, i) => `${i === 0 ? "L" : "L"} ${p}`),
    `L ${width - padding},${height - padding}`,
    "Z",
  ].join(" ")

  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.total}>{total} submissions</Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={areaPath} fill="rgba(155, 69, 37, 0.12)" />
        <Polyline
          points={points.join(" ")}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  total: {
    ...typography.caption,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  empty: {
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.mutedForeground,
  },
})
