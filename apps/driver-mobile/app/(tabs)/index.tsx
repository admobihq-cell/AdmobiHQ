import { useUser } from "@clerk/clerk-expo"
import { Link } from "expo-router"
import { Pressable, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Clock, Deliveries, HelpCircle, Routes, TrendingUp, Wallet } from "@/components/icons"
import { StatCard } from "@/components/ui/stat-card"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { usePlatformFlags } from "@/lib/flags"
import { EARNINGS_STATS, RECENT_ACTIVITY } from "@/lib/placeholder-data"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const STAT_ICONS = [Wallet, Clock, TrendingUp, Routes] as const

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function useSignedInUser() {
  return useUser()
}

function useNoUser() {
  return { user: null }
}

/**
 * Same "pick the hook once at module load" pattern used elsewhere — useUser()
 * must never run unless ClerkProvider is mounted.
 */
const useUserIfEnabled = isAuthEnabled() ? useSignedInUser : useNoUser

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const flags = usePlatformFlags()
  const { user } = useUserIfEnabled()

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
    eyebrow: {
      ...typography.caption,
      color: c.primary,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
    },
    title: { ...typography.largeTitle, fontSize: 26, color: c.text },
    subtitle: { ...typography.body, color: c.mutedForeground },
    statsGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    section: { gap: spacing.sm },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    actionsRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    actionChip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    actionChipPressed: { opacity: 0.7 },
    actionChipText: {
      ...typography.bodySm,
      fontWeight: "600" as const,
      color: c.text,
    },
    activityCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: "hidden" as const,
    },
    activityRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: spacing.md,
      padding: spacing.md,
    },
    activityDivider: { height: 1, backgroundColor: c.border },
    activityDot: {
      marginTop: 6,
      width: 8,
      height: 8,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    activityCopy: { flex: 1, gap: 2 },
    activityTitle: { ...typography.section, fontSize: 14, color: c.text },
    activityDetail: { ...typography.caption, color: c.mutedForeground },
    activityTime: { ...typography.caption, color: c.mutedForeground },
  }))

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.eyebrow}>
          {user?.firstName
            ? `${getGreeting(new Date().getHours())}, ${user.firstName}`
            : getGreeting(new Date().getHours())}
        </Text>
        <Text style={styles.title}>Your day at a glance</Text>
        <Text style={styles.subtitle}>
          Placeholder dashboard — earnings, routes, and payouts will connect to
          live telemetry here.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {EARNINGS_STATS.map((stat, index) => (
          <StatCard
            key={stat.label}
            icon={STAT_ICONS[index]!}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.actionsRow}>
          <Link href="/earnings" asChild>
            <Pressable style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}>
              <Wallet size={16} color={colors.text} />
              <Text style={styles.actionChipText}>Earnings</Text>
            </Pressable>
          </Link>
          <Link href="/routes" asChild>
            <Pressable style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}>
              <Routes size={16} color={colors.text} />
              <Text style={styles.actionChipText}>Routes</Text>
            </Pressable>
          </Link>
          {flags.deliveries ? (
            <Link href="/deliveries" asChild>
              <Pressable style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}>
                <Deliveries size={16} color={colors.text} />
                <Text style={styles.actionChipText}>Deliveries</Text>
              </Pressable>
            </Link>
          ) : null}
          <Link href="/support" asChild>
            <Pressable style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}>
              <HelpCircle size={16} color={colors.text} />
              <Text style={styles.actionChipText}>Get help</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Recent activity</Text>
        <View style={styles.activityCard}>
          {RECENT_ACTIVITY.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <View style={styles.activityDivider} /> : null}
              <View style={styles.activityRow}>
                <View style={styles.activityDot} />
                <View style={styles.activityCopy}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityDetail}>{item.detail}</Text>
                </View>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}
