import { useCallback, useMemo, useState } from "react"
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native"

import { Bell } from "@/components/icons"
import { NotificationRow } from "@/components/notifications/notification-row"
import { FilterChips } from "@/components/ui/filter-chips"
import {
  INITIAL_NOTIFICATIONS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_ORDER,
  type NotificationCategory,
  type NotificationItem,
} from "@/lib/notifications-data"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

const CATEGORY_OPTIONS = NOTIFICATION_CATEGORY_ORDER.map((key) => ({
  key,
  label: NOTIFICATION_CATEGORY_LABELS[key],
}))

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [category, setCategory] = useState<NotificationCategory | null>(null)
  const unreadCount = items.filter((item) => !item.read).length

  const markRead = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setItems((current) => current.map((item) => ({ ...item, read: true })))
  }, [])

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
          <Pressable onPress={markAllRead} hitSlop={8}>
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
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={() => markRead(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Bell size={26} />
            </View>
            <Text style={styles.emptyTitle}>Nothing here</Text>
            <Text style={styles.emptyBody}>
              No notifications in this category yet.
            </Text>
          </View>
        }
      />
    </View>
  )
}
