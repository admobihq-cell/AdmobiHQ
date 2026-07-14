import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { BarChart3 } from "@/components/icons"
import type { DateRangeKey, StatsResponseDto } from "@workspace/ops-contracts"

import { EmptyState, StatCard } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { OPS_URL, useOpsClient } from "@/lib/ops-client"
import { colors, radius, spacing, typography } from "@/lib/theme"

const RANGES: Array<{ key: DateRangeKey; label: string }> = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
]

export default function OverviewScreen() {
  const client = useOpsClient()
  const [range, setRange] = useState<DateRangeKey>("30d")
  const [stats, setStats] = useState<StatsResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const data = await client.stats.get({ range })
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) setError(formatOpsError(err, OPS_URL))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchStats()
    return () => {
      cancelled = true
    }
  }, [range])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.description}>
        Submission totals and breakdown by type for the selected period.
      </Text>

      <View style={styles.segmented}>
        {RANGES.map((item) => {
          const active = range === item.key
          return (
            <Pressable
              key={item.key}
              onPress={() => setRange(item.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : stats ? (
        <>
          <View style={styles.grid}>
            {Object.entries(stats.overview.totals).map(([key, value]) => (
              <StatCard key={key} value={value} label={key} />
            ))}
          </View>

          <Text style={styles.sectionTitle}>By type</Text>
          <View style={styles.table}>
            {stats.overview.byType.map((row, index) => (
              <View
                key={row.name}
                style={[
                  styles.tableRow,
                  index < stats.overview.byType.length - 1 &&
                    styles.tableRowBorder,
                ]}
              >
                <Text style={styles.rowLabel}>{row.name}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No stats available"
          description="Try a different date range."
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  description: {
    ...typography.bodySm,
    color: colors.mutedForeground,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.mutedForeground,
    fontWeight: "600",
    fontSize: 13,
  },
  segmentTextActive: {
    color: colors.primaryForeground,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    marginTop: spacing.sm,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    ...typography.bodySm,
    color: colors.mutedForeground,
  },
  rowValue: {
    color: colors.text,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  error: {
    color: colors.danger,
    ...typography.bodySm,
  },
})
