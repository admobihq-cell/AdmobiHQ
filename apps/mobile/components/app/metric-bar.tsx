import { StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing, typography } from "@/lib/theme"

type MetricBarProps = {
  label: string
  value: number
  maxValue: number
}

export function MetricBar({ label, value, maxValue }: MetricBarProps) {
  const widthPercent = maxValue > 0 ? Math.max(4, (value / maxValue) * 100) : 0

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${widthPercent}%` }]} />
      </View>
    </View>
  )
}

type MetricBarListProps = {
  items: Array<{ name: string; value: number }>
}

export function MetricBarList({ items }: MetricBarListProps) {
  const maxValue = Math.max(...items.map((i) => i.value), 1)

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <MetricBar
          key={item.name}
          label={item.name}
          value={item.value}
          maxValue={maxValue}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    ...typography.bodySm,
    color: colors.mutedForeground,
    flex: 1,
    marginRight: spacing.sm,
  },
  value: {
    ...typography.bodySm,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
})
