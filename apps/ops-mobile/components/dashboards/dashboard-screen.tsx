import { useState, type ReactNode } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { ChartSkeleton, KpiStripSkeleton, RangeToolbar, StatusPill, type ChartPalette } from "@workspace/mobile-charts"
import type { OpsClient } from "@workspace/ops-api-client"
import type { DateRangeKey, OpsPermission, StatusTone } from "@workspace/ops-contracts"

import { BarChart3 } from "@/components/icons"
import { EmptyState } from "@/components/ui"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsAccess, useOpsAuthReady, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { spacing, useThemedStyles } from "@/lib/theme"

/**
 * The frame every ops dashboard shares: the permission gate (nothing is requested without it), the
 * range toolbar, pull to refresh, skeletons and the error banner. `name` is the cache key part, so
 * the Campaigns tabs each keep their own data.
 */
export function DashboardScreen<T>({
  title,
  permission,
  name,
  load,
  header,
  children,
}: {
  title: string
  permission: OpsPermission
  name: string
  load: (client: OpsClient, range: DateRangeKey) => Promise<T>
  /** Sits above the range toolbar (the Campaigns tabs). */
  header?: (palette: ChartPalette) => ReactNode
  children: (data: T, palette: ChartPalette) => ReactNode
}) {
  usePageHeader(title)
  const palette = useChartPalette()
  const client = useOpsClient()
  const authReady = useOpsAuthReady()
  const { role, permissions, loading } = useOpsAccess()
  const allowed = role === "admin" || permissions.includes(permission)
  const [range, setRange] = useState<DateRangeKey>("30d")

  const query = useQuery({
    queryKey: ["ops-dashboards", name, range] as const,
    queryFn: () => load(client, range),
    enabled: authReady && allowed,
    // Keep the old figures on screen while a new range loads, but never another tab's: its shape differs.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[1] === name ? previous : undefined),
  })

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, backgroundColor: c.bg, alignItems: "center" as const, justifyContent: "center" as const },
    content: { padding: spacing.lg, gap: 12, paddingBottom: spacing.xl },
  }))

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    )
  }
  if (!allowed) {
    return (
      <View style={styles.centered}>
        <EmptyState icon={BarChart3} title={`You don't have access to the ${title} dashboard`} description="Ask an admin to grant the permission." />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
    >
      {header?.(palette)}
      <RangeToolbar palette={palette} value={range} onChange={setRange} />
      {query.isPending ? (
        <>
          <KpiStripSkeleton palette={palette} />
          <ChartSkeleton palette={palette} />
          <ChartSkeleton palette={palette} />
        </>
      ) : query.isError ? (
        <ApiErrorBanner message={formatOpsError(query.error, API_URL)} onRetry={() => void query.refetch()} />
      ) : (
        children(query.data, palette)
      )}
    </ScrollView>
  )
}

export type QueueItem = {
  key: string
  title: string
  meta?: string
  /** A second, longer line: the reason and what to do next. */
  detail?: string
  tag?: { label: string; tone: StatusTone }
  /** A figure on the right: a balance, a rate, a wait. */
  trailing?: string
  onPress?: () => void
}

/** Rows that need a person: review queues, at-risk accounts, oldest cases. Tappable when they open a record. */
export function QueueList({ items, palette }: { items: QueueItem[]; palette: ChartPalette }) {
  return (
    <View>
      {items.map((item) => {
        const body = (
          <>
            <View style={rows.copy}>
              <Text style={[rows.title, { color: palette.text }]}>{item.title}</Text>
              {item.meta ? <Text style={[rows.meta, { color: palette.muted }]}>{item.meta}</Text> : null}
              {item.detail ? <Text style={[rows.meta, { color: palette.muted }]}>{item.detail}</Text> : null}
            </View>
            <View style={rows.side}>
              {item.tag ? <StatusPill label={item.tag.label} tone={item.tag.tone} palette={palette} /> : null}
              {item.trailing ? <Text style={[rows.trailing, { color: palette.text }]}>{item.trailing}</Text> : null}
            </View>
          </>
        )
        return item.onPress ? (
          <Pressable key={item.key} onPress={item.onPress} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={rows.row}>
            {body}
          </Pressable>
        ) : (
          <View key={item.key} style={rows.row}>
            {body}
          </View>
        )
      })}
    </View>
  )
}

/** The small grey line under a headline figure. */
export function Note({ children, palette }: { children: ReactNode; palette: ChartPalette }) {
  return <Text style={[rows.meta, { color: palette.muted }]}>{children}</Text>
}

const rows = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, paddingVertical: 8 },
  copy: { flex: 1, gap: 2 },
  side: { alignItems: "flex-end", gap: 4 },
  title: { fontSize: 14, fontWeight: "600" },
  meta: { fontSize: 12, lineHeight: 17 },
  trailing: { fontSize: 14, fontVariant: ["tabular-nums"] },
})
