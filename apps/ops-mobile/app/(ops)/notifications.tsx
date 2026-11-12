import { useCallback } from "react"
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { StatusPill } from "@workspace/mobile-charts"
import type { ActionQueueItem } from "@workspace/ops-contracts"

import { ChevronRight, ShieldCheck } from "@/components/icons"
import { EmptyState } from "@/components/ui"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { spacing, useThemedStyles } from "@/lib/theme"
import { mobileHref, useActionQueue } from "@/lib/use-action-queue"

const GROUPS: { tone: ActionQueueItem["tone"]; title: string; pill: string }[] = [
  { tone: "serious", title: "Act now", pill: "Urgent" },
  { tone: "warning", title: "Waiting on someone", pill: "Waiting" },
  { tone: "neutral", title: "Worth a look", pill: "Info" },
]

/**
 * The attention queue the header bell opens: the same rows as the ops Overview, filtered by the API
 * to this person's permissions. Each opens the dashboard or tab that explains it.
 */
export default function AttentionQueueScreen() {
  usePageHeader("Needs attention", { showBack: true, backHref: "/(ops)/dashboard" })
  const palette = useChartPalette()
  const router = useRouter()
  const queue = useActionQueue()
  const { refetch } = queue

  // Counts go stale the moment someone acts on one; coming back to the screen re-asks.
  useFocusEffect(
    useCallback(() => {
      void refetch()
    }, [refetch]),
  )

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: 8, flexGrow: 1 },
    section: { fontSize: 12, fontWeight: "600" as const, color: c.mutedForeground, textTransform: "uppercase" as const, marginTop: 8 },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      padding: spacing.md,
      minHeight: 56,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    count: { fontSize: 22, fontWeight: "700" as const, color: c.text, minWidth: 36, fontVariant: ["tabular-nums" as const] },
    copy: { flex: 1, gap: 2 },
    title: { fontSize: 15, fontWeight: "600" as const, color: c.text },
    meta: { fontSize: 12, color: c.mutedForeground },
    action: { fontSize: 12, fontWeight: "600" as const, color: c.primary },
  }))

  const items = queue.data ?? []
  const sections = GROUPS.map((g) => ({ ...g, data: items.filter((i) => i.tone === g.tone) })).filter((s) => s.data.length > 0)

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item) => item.title}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={queue.isRefetching} onRefresh={() => void refetch()} />}
      ListHeaderComponent={
        queue.isError ? <ApiErrorBanner message={formatOpsError(queue.error, API_URL)} onRetry={() => void refetch()} /> : null
      }
      ListEmptyComponent={
        queue.isPending || queue.isError ? null : (
          <EmptyState icon={ShieldCheck} title="Nothing needs attention" description="Reviews, applications, urgent cases and payouts that need someone show up here." />
        )
      }
      renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
      renderItem={({ item, section }) => (
        <Pressable
          onPress={() => router.push(mobileHref(item.href) as never)}
          accessibilityRole="button"
          accessibilityLabel={`${item.count} ${item.title}. ${item.action}`}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <Text style={styles.count}>{item.count}</Text>
          <View style={styles.copy}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.meta}</Text>
            <Text style={styles.action}>{item.action}</Text>
          </View>
          <StatusPill label={section.pill} tone={item.tone} palette={palette} />
          <ChevronRight size={16} color={palette.muted} />
        </Pressable>
      )}
    />
  )
}
