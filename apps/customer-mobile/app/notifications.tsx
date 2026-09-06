import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"

import { SkeletonListRows } from "@/components/app/skeleton"
import { Bell } from "@/components/icons"
import { NotificationRow } from "@/components/notifications/notification-row"
import { FilterChips } from "@/components/ui/filter-chips"
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_ORDER,
  type NotificationCategory,
  type NotificationItem,
} from "@/lib/notifications-data"
import { useCustomerInbox } from "@/lib/use-customer-inbox"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const CATEGORY_OPTIONS = NOTIFICATION_CATEGORY_ORDER.map((key) => ({
  key,
  label: NOTIFICATION_CATEGORY_LABELS[key],
}))

export default function NotificationsScreen() {
  const colors = useThemeColors()
  const router = useRouter()
  const [category, setCategory] = useState<NotificationCategory | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // Tick so relative timestamps (5m ago → 6m ago) refresh while the screen is open.
  const [, setClock] = useState(0)

  const { items, unreadCount, loading, refetch, markRead, markAllRead } = useCustomerInbox()

  useEffect(() => {
    const id = setInterval(() => setClock((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  /** A campaign row names its own destination, so opening it lands on the
   * campaign rather than leaving the reader to go find it. */
  const onRowPress = useCallback(
    (item: NotificationItem) => {
      void markRead(item)
      if (item.href) router.push(item.href as never)
    },
    [markRead, router],
  )

  const sections = useMemo(() => {
    const filtered = category ? items.filter((item) => item.category === category) : items
    return [
      { title: "Today", data: filtered.filter((item) => item.group === "today") },
      { title: "Earlier", data: filtered.filter((item) => item.group === "earlier") },
    ].filter((section) => section.data.length > 0)
  }, [items, category])

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    listHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    unreadLabel: {
      ...typography.caption,
      color: c.mutedForeground,
    },
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
      ...typography.title,
      fontSize: 20,
      color: c.text,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 68,
    },
    empty: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl * 2,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: spacing.xs,
    },
    emptyTitle: {
      ...typography.headline,
      color: c.text,
    },
    emptyBody: {
      ...typography.body,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
    list: { flexGrow: 1, paddingBottom: spacing.xl },
  }))

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.unreadLabel}>
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={() => void markAllRead()} hitSlop={8}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        ) : null}
      </View>

      <FilterChips
        options={CATEGORY_OPTIONS}
        selected={category}
        onSelect={(key) => setCategory(key as NotificationCategory | null)}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={() => onRowPress(item)} />
        )}
        ListEmptyComponent={
          loading ? (
            <SkeletonListRows count={6} />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Bell size={26} />
              </View>
              <Text style={styles.emptyTitle}>Nothing here</Text>
              <Text style={styles.emptyBody}>
                {category
                  ? "No notifications in this category yet."
                  : "You're all caught up — campaign updates and announcements show up here."}
              </Text>
            </View>
          )
        }
      />
    </View>
  )
}
