import { useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"

import { PieChart, PieLegend, type PieSlice } from "@/components/app/pie-chart"
import { SkeletonBlock } from "@/components/app/skeleton"
import { ViewDropdown } from "@/components/ui/view-dropdown"
import { colors, spacing, typography } from "@/lib/theme"

const SLICE_COLORS = [
  colors.primary,
  "#B85A38",
  "#C96E4A",
  "#D4825C",
  "#A67C52",
  "#8B7355",
  "#E0966E",
  "#6B6760",
]

export type BreakdownView = {
  key: string
  label: string
  title: string
  subtitle: string
  items: Array<{ name: string; value: number }>
}

function normalizeItems(items: Array<{ name: string; value: number }>) {
  return items
    .map((item) => ({
      name: item.name?.trim() || "Unknown",
      value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0,
    }))
    .filter((item) => item.name.length > 0 && item.value > 0)
}

function toPieSlices(items: Array<{ name: string; value: number }>): PieSlice[] {
  const sorted = [...items].sort((a, b) => b.value - a.value)
  return sorted.map((item, index) => ({
    name: item.name,
    value: item.value,
    color: SLICE_COLORS[index % SLICE_COLORS.length]!,
  }))
}

function viewHasData(view: BreakdownView) {
  return normalizeItems(view.items).length > 0
}

type BreakdownChartProps = {
  title?: string
  subtitle?: string
  items: Array<{ name: string; value: number }>
  loading?: boolean
}

export function BreakdownChart({
  title = "By type",
  subtitle = "Share of submissions in this period",
  items,
  loading,
}: BreakdownChartProps) {
  return (
    <BreakdownPieSwitcher
      loading={loading}
      views={[
        {
          key: "single",
          label: title,
          title,
          subtitle,
          items,
        },
      ]}
    />
  )
}

type BreakdownPieSwitcherProps = {
  views: BreakdownView[]
  loading?: boolean
}

export function BreakdownPieSwitcher({
  views,
  loading,
}: BreakdownPieSwitcherProps) {
  const availableViews = useMemo(
    () => views.filter((view) => loading || viewHasData(view)),
    [views, loading],
  )

  const [selectedKey, setSelectedKey] = useState(availableViews[0]?.key ?? "")

  useEffect(() => {
    if (!availableViews.some((view) => view.key === selectedKey)) {
      setSelectedKey(availableViews[0]?.key ?? "")
    }
  }, [availableViews, selectedKey])

  const currentView =
    availableViews.find((view) => view.key === selectedKey) ?? availableViews[0]

  if (!loading && availableViews.length === 0) {
    return null
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <SkeletonBlock width={100} height={14} />
          <SkeletonBlock width={120} height={32} borderRadius={999} />
        </View>
        <SkeletonBlock width={180} height={12} style={styles.skeletonGap} />
        <SkeletonBlock
          width={200}
          height={200}
          borderRadius={999}
          style={styles.pieSkeleton}
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} width="100%" height={20} borderRadius={8} />
        ))}
      </View>
    )
  }

  if (!currentView) {
    return null
  }

  const normalized = normalizeItems(currentView.items)
  const slices = toPieSlices(normalized)
  const total = normalized.reduce((sum, item) => sum + item.value, 0)

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>{currentView.title}</Text>
        <ViewDropdown
          options={availableViews.map((view) => ({
            key: view.key,
            label: view.label,
          }))}
          value={currentView.key}
          onChange={setSelectedKey}
        />
      </View>
      <Text style={styles.cardSubtitle}>{currentView.subtitle}</Text>

      <PieChart slices={slices} centerValue={total} centerLabel="total" />

      <PieLegend slices={slices} total={total} />
    </View>
  )
}

/** @deprecated Use BreakdownPieSwitcher */
export function MetricBarList({
  items,
}: {
  items: Array<{ name: string; value: number }>
}) {
  return <BreakdownChart items={items} />
}

/** @deprecated Pie chart breakdown replaced bar rows */
export function MetricBar(_props: {
  label: string
  value: number
  maxValue: number
}) {
  return null
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.section,
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: -spacing.sm,
  },
  pieSkeleton: {
    alignSelf: "center",
  },
  skeletonGap: {
    marginTop: 6,
  },
})
