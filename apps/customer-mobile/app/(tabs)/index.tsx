import { useMemo } from "react"
import { useRouter } from "expo-router"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Campaigns, Eye, Map, Radio, TrendingUp } from "@/components/icons"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { StatCard } from "@/components/ui/stat-card"
import { WalletPreviewCard } from "@/components/wallet/wallet-preview-card"
import { spacing, typography, useThemeColors } from "@/lib/theme"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

const RECENT_ACTIVITY = [
  {
    id: "1",
    title: "Westlands Retail Push",
    detail: "Delivery reached 92% of weekly target",
    time: "2h ago",
  },
  {
    id: "2",
    title: "CBD Summer Flight",
    detail: "18 new proof-of-play events recorded",
    time: "5h ago",
  },
  {
    id: "3",
    title: "Karen Estate Awareness",
    detail: "Scheduled to start Monday · 6 corridors",
    time: "Yesterday",
  },
] as const

export default function OverviewScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flex: 1 },
        content: { gap: spacing.lg, paddingHorizontal: spacing.lg },
        hero: { gap: spacing.sm },
        heroTop: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: spacing.md,
        },
        heroEyebrow: {
          ...typography.caption,
          color: colors.primary,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontWeight: "700",
        },
        heroTitle: {
          ...typography.title,
          color: colors.text,
        },
        heroBody: {
          ...typography.body,
          color: colors.mutedForeground,
        },
        sectionLabel: {
          ...typography.caption,
          color: colors.mutedForeground,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontWeight: "700",
          marginLeft: spacing.xs,
        },
        statsGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
        },
        section: { gap: spacing.sm },
        actions: {
          flexDirection: "row",
          gap: spacing.sm,
        },
        action: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          paddingVertical: spacing.md,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        actionPressed: {
          opacity: 0.75,
        },
        actionLabel: {
          ...typography.section,
          color: colors.text,
        },
        group: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          overflow: "hidden",
        },
        activityRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.md,
          padding: spacing.md,
        },
        activityDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.primary,
          marginTop: 5,
        },
        activityCopy: {
          flex: 1,
          gap: 2,
        },
        activityTitle: {
          ...typography.section,
          color: colors.text,
        },
        activityDetail: {
          ...typography.caption,
          color: colors.mutedForeground,
          lineHeight: 18,
        },
        activityTime: {
          ...typography.caption,
          color: colors.mutedForeground,
          fontWeight: "600",
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: spacing.md + 10 + spacing.md,
        },
      }),
    [colors],
  )

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text style={styles.heroEyebrow}>{getGreeting()}</Text>
            <Text style={styles.heroTitle}>Your campaigns at a glance</Text>
          </View>
          <ThemeToggleButton />
        </View>
        <Text style={styles.heroBody}>
          Placeholder dashboard — live metrics and reporting will connect to
          your Admobi account here.
        </Text>
      </View>

      <WalletPreviewCard />

      <View style={styles.statsGrid}>
        <StatCard icon={Radio} label="Active campaigns" value="3" hint="+1 this week" />
        <StatCard icon={Eye} label="Impressions" value="1.2M" hint="Last 30 days" />
        <StatCard icon={TrendingUp} label="Delivery rate" value="84%" hint="On target" />
        <StatCard icon={Campaigns} label="Spend" value="KES 420k" hint="Month to date" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            onPress={() => router.push("/campaigns")}
          >
            <Campaigns color={colors.primary} size={22} />
            <Text style={styles.actionLabel}>View campaigns</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            onPress={() => router.push("/map")}
          >
            <Map color={colors.primary} size={22} />
            <Text style={styles.actionLabel}>Open map</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Recent activity</Text>
        <View style={styles.group}>
          {RECENT_ACTIVITY.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
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
