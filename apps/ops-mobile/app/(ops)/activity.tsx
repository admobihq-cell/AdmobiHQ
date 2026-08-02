import { useCallback, useEffect, useMemo, useState } from "react"
import { SectionList, StyleSheet, Text, View } from "react-native"

import { ActivityRow } from "@/components/activity/activity-row"
import { FilterChips } from "@/components/app/filter-chips"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { EmptyState } from "@/components/ui"
import { Clock, Inbox } from "@/components/icons"
import { PageHero } from "@/components/ui/page-hero"
import {
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_ORDER,
  auditEventToActivityItem,
  type ActivityCategory,
  type ActivityItem,
} from "@/lib/activity-feed"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

const CATEGORY_OPTIONS = ACTIVITY_CATEGORY_ORDER.map((key) => ({
  key,
  label: ACTIVITY_CATEGORY_LABELS[key],
}))

export default function ActivityScreen() {
  usePageHeader("Activity", { showBack: true, backHref: "/(ops)/dashboard" })
  const client = useOpsClient()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<ActivityCategory | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const result = await client.audit.list({ page: 1, pageSize: 50 })
      setItems(result.items.map(auditEventToActivityItem))
    } catch (err) {
      setError(formatOpsError(err, API_URL))
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void fetchActivity()
  }, [fetchActivity])

  const sections = useMemo(() => {
    const filtered = category
      ? items.filter((item) => item.category === category)
      : items
    return [
      {
        title: "Today",
        data: filtered.filter((item) => item.group === "today"),
      },
      {
        title: "Earlier",
        data: filtered.filter((item) => item.group === "earlier"),
      },
    ].filter((section) => section.data.length > 0)
  }, [items, category])

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    errorWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    listHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    countLabel: { ...typography.caption, color: c.mutedForeground },
    sectionHeader: {
      backgroundColor: c.bg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: c.text,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: spacing.lg,
    },
    list: { flexGrow: 1, paddingBottom: spacing.xl },
  }))

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: spacing.md }]}>
        <PageHero
          icon={Clock}
          title="Activity"
          compact
          description="Who changed what — ops edits, public submissions, and broadcasts."
        />
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <ApiErrorBanner
            message={error}
            onRetry={() => void fetchActivity()}
            onDismiss={() => setError(null)}
          />
        </View>
      ) : null}

      <View style={styles.listHeader}>
        <Text style={styles.countLabel}>
          {loading
            ? "Loading…"
            : items.length > 0
              ? `${items.length} recent events`
              : "No events yet"}
        </Text>
      </View>

      <FilterChips
        options={CATEGORY_OPTIONS}
        selected={category}
        onSelect={(key) => setCategory(key as ActivityCategory | null)}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon={Inbox}
              title="No activity yet"
              description="Ops edits and public form submissions will show up here."
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <ActivityRow item={item} onPress={() => {}} />
        )}
      />
    </View>
  )
}
