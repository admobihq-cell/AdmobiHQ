import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { AnnouncementDto } from "@workspace/ops-contracts"
import { formatDateTime } from "@workspace/ops-contracts"

import { ActivityRow } from "@/components/activity/activity-row"
import { FilterChips } from "@/components/app/filter-chips"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { PageHero } from "@/components/ui/page-hero"
import {
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_ORDER,
  PLACEHOLDER_ACTIVITY,
  type ActivityCategory,
  type ActivityGroup,
  type ActivityItem,
} from "@/lib/activity-feed"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

const CATEGORY_OPTIONS = ACTIVITY_CATEGORY_ORDER.map((key) => ({
  key,
  label: ACTIVITY_CATEGORY_LABELS[key],
}))

function isToday(value: string): boolean {
  const d = new Date(value)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default function ActivityScreen() {
  const client = useOpsClient()
  const insets = useSafeAreaInsets()
  const [placeholderItems, setPlaceholderItems] = useState<ActivityItem[]>(PLACEHOLDER_ACTIVITY)
  const [announcements, setAnnouncements] = useState<ActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<ActivityCategory | null>(null)

  const fetchAnnouncements = useCallback(async () => {
    try {
      setError(null)
      const result = await client.notifications.list({ page: 1, pageSize: 10 })
      setAnnouncements(
        result.items.map((dto: AnnouncementDto) => {
          const group: ActivityGroup = isToday(dto.created_at) ? "today" : "earlier"
          return {
            id: `a-${dto.id}`,
            category: "announcement" as const,
            title: dto.title,
            body: dto.body,
            time: formatDateTime(dto.created_at),
            read: true,
            group,
          }
        }),
      )
    } catch (err) {
      setError(formatOpsError(err, API_URL))
    }
  }, [client])

  useEffect(() => {
    void fetchAnnouncements()
  }, [fetchAnnouncements])

  const markRead = useCallback((id: string) => {
    setPlaceholderItems((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setPlaceholderItems((current) => current.map((item) => ({ ...item, read: true })))
  }, [])

  const items = useMemo(
    () => [...placeholderItems, ...announcements],
    [placeholderItems, announcements],
  )
  const unreadCount = placeholderItems.filter((item) => !item.read).length

  const sections = useMemo(() => {
    const filtered = category ? items.filter((item) => item.category === category) : items
    return [
      { title: "Today", data: filtered.filter((item) => item.group === "today") },
      { title: "Earlier", data: filtered.filter((item) => item.group === "earlier") },
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
    unreadLabel: { ...typography.caption, color: c.mutedForeground },
    markAllText: {
      ...typography.label,
      color: c.primary,
      fontWeight: "700" as const,
    },
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
      marginLeft: 68,
    },
    list: { flexGrow: 1, paddingBottom: spacing.xl },
  }))

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <PageHero
          eyebrow="Operations"
          title="Activity"
          compact
          description="Leads, drivers, fleet alerts, and announcements you've sent."
        />
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <ApiErrorBanner
            message={error}
            onRetry={() => void fetchAnnouncements()}
            onDismiss={() => setError(null)}
          />
        </View>
      ) : null}

      <View style={styles.listHeader}>
        <Text style={styles.unreadLabel}>
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        ) : null}
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
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <ActivityRow
            item={item}
            onPress={() => item.category !== "announcement" && markRead(item.id)}
          />
        )}
      />
    </View>
  )
}
