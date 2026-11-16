import { useUser } from "@clerk/clerk-expo"
import { Link } from "expo-router"
import { useCallback, useState } from "react"
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { payoutDestinationLabel } from "@workspace/ops-contracts"

import { ChevronRight } from "@/components/icons"
import { PayoutHero } from "@/components/payout-hero"
import { withProfileGate } from "@/components/profile-setup/with-profile-gate"
import { useDriverPayouts } from "@/lib/driver-payouts"
import { useDriverProfile } from "@/lib/driver-profile"
import { formatRelativeTime, NOTIFICATION_CATEGORY_LABELS } from "@/lib/notifications-data"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"
import { useLiveAnnouncements } from "@/lib/use-live-announcements"

const UPDATES_SHOWN = 3

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

/** Home: the payout first, then what's new. Mirrors apps/driver-web's dashboard. */
function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { user } = useUser()
  const { profile } = useDriverProfile()
  const payouts = useDriverPayouts()
  const updates = useLiveAnnouncements()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([payouts.refetch(), updates.refetch()])
    setRefreshing(false)
  }, [payouts, updates])

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.xl },
    title: { ...typography.title, fontSize: 26, color: c.text },
    sectionHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    sectionTitle: { ...typography.headline, fontSize: 18, color: c.text },
    seeAll: { flexDirection: "row" as const, alignItems: "center" as const, gap: 2, minHeight: 44 },
    seeAllText: { ...typography.section, color: c.primary },
    list: { borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, overflow: "hidden" as const },
    row: { flexDirection: "row" as const, gap: spacing.md, padding: spacing.md, minHeight: 56 },
    rowPressed: { backgroundColor: c.muted },
    divider: { height: 1, backgroundColor: c.border },
    unreadDot: { marginTop: 7, width: 8, height: 8, borderRadius: 4 },
    rowCopy: { flex: 1, gap: 2 },
    rowTitle: { ...typography.section, fontSize: 14, color: c.text },
    rowMeta: { ...typography.caption, color: c.mutedForeground },
    empty: {
      padding: spacing.lg,
      borderRadius: 20,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
    },
    emptyText: { ...typography.bodySm, color: c.mutedForeground },
  }))

  const greeting = getGreeting(new Date().getHours())
  const shown = updates.items.slice(0, UPDATES_SHOWN)

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={styles.title} accessibilityRole="header">
        {user?.firstName ? `${greeting}, ${user.firstName}` : greeting}
      </Text>

      <PayoutHero destination={profile ? payoutDestinationLabel(profile) : null} showHistoryLink />

      <View style={{ gap: spacing.sm }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Updates
          </Text>
          {updates.items.length > 0 ? (
            <Link href="/notifications" asChild>
              <Pressable accessibilityRole="link" style={styles.seeAll} hitSlop={8}>
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={16} color={colors.primary} />
              </Pressable>
            </Link>
          ) : null}
        </View>

        {updates.loading ? null : shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Nothing new. Announcements from Admobi and news about your account land here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {shown.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Link href="/notifications" asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`${item.title}${item.read ? "" : ", unread"}`}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <View style={[styles.unreadDot, { backgroundColor: item.read ? "transparent" : colors.primary }]} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {NOTIFICATION_CATEGORY_LABELS[item.category]} · {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default withProfileGate(DashboardScreen)
