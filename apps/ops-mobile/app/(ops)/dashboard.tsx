import { useMemo, useState } from "react"
import { useUser } from "@clerk/clerk-expo"
import { useRouter } from "expo-router"
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { DateRangeKey } from "@workspace/ops-contracts"
import {
  BarChart3,
  Car,
  ChevronRight,
  FileText,
  Mail,
  Megaphone,
  Truck,
} from "@/components/icons"

import { ActionCard } from "@/components/ui/action-card"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { StatCard } from "@/components/ui/stat-card"
import { DashboardBanner } from "@/components/app/dashboard-banner"
import { BreakdownPieSwitcher } from "@/components/app/metric-bar"
import { RangeDropdown } from "@/components/app/range-dropdown"
import { AvatarInitials } from "@/components/app/list-row"
import { SkeletonListRows } from "@/components/app/skeleton"
import { ActivityChart } from "@/components/app/sparkline"
import { ActivityBellButton } from "@/components/activity/activity-bell-button"
import { getPrimaryEmail } from "@/lib/auth"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useRecentSubmissions } from "@/hooks/use-recent-submissions"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { useThemeColors, spacing, typography, radius } from "@/lib/theme"

const RANGES: Array<{ key: DateRangeKey; label: string }> = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function DashboardScreen() {
  const colors = useThemeColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId,
  )
  const rawName =
    user?.firstName?.trim() || email?.split("@")[0] || "there"
  const displayName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const { stats, loading, error, range, setRange, refetch } =
    useDashboardStats("30d")
  const {
    items: recentItems,
    loading: recentLoading,
    error: recentError,
    refetch: refetchRecent,
  } = useRecentSubmissions(8)

  const totals = stats?.overview?.totals
  const byType = stats?.overview?.byType ?? []
  const driversByCity = stats?.overview?.driversByCity ?? []
  const [refreshing, setRefreshing] = useState(false)

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          flex: 1,
        },
        content: {
          gap: spacing.lg,
        },
        padded: {
          paddingHorizontal: spacing.lg,
        },
        appHeader: {
          paddingHorizontal: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        brandLockup: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        },
        brandMark: {
          width: 28,
          height: 28,
          borderRadius: radius.sm,
        },
        brandName: {
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: -0.2,
          color: colors.text,
        },
        bannerWrap: {
          paddingHorizontal: spacing.lg,
          marginTop: spacing.md,
        },
        recentError: {
          marginBottom: spacing.sm,
        },
        heroTrailing: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        },
        sectionLabel: {
          ...typography.caption,
          color: colors.mutedForeground,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontWeight: "700",
          marginBottom: spacing.sm,
          marginLeft: spacing.xs,
        },
        sectionLabelInline: {
          marginBottom: 0,
        },
        sectionHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.sm,
        },
        statsGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
        },
        group: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          overflow: "hidden",
        },
        actions: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
        },
        activityRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.md,
          padding: spacing.md,
        },
        activityPressed: {
          opacity: 0.75,
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
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: spacing.md + 10 + spacing.md,
        },
        emptyRecent: {
          padding: spacing.lg,
          alignItems: "center",
        },
        emptyText: {
          ...typography.bodySm,
          color: colors.mutedForeground,
        },
      }),
    [colors],
  )

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetch(), refetchRecent()])
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.appHeader}>
        <View style={styles.brandLockup}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.brandMark}
            resizeMode="contain"
            accessibilityLabel="Admobi"
          />
          <Text style={styles.brandName}>Admobi Ops</Text>
        </View>
        <View style={styles.heroTrailing}>
          <AvatarInitials
            name={displayName}
            onPress={() => router.push("/(ops)/profile")}
          />
          <ActivityBellButton />
          <ThemeToggleButton />
        </View>
      </View>

      <View style={styles.bannerWrap}>
        <DashboardBanner
          eyebrow={getGreeting()}
          title={`Welcome back, ${displayName}`}
          description="Operational pulse across leads, fleet, drivers, and signups."
        />
      </View>

      {error ? (
        <View style={styles.padded}>
          <ApiErrorBanner message={error} onRetry={refetch} />
        </View>
      ) : null}

      <View style={styles.padded}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionLabel, styles.sectionLabelInline]}>Overview</Text>
          <RangeDropdown options={RANGES} selected={range} onSelect={setRange} />
        </View>
        <View style={styles.statsGrid}>
          {loading && !totals && !error ? (
            <>
              <StatCard icon={BarChart3} label="Total" value="—" emphasis />
              <StatCard icon={Megaphone} label="Leads" value="—" />
              <StatCard icon={Truck} label="Fleet" value="—" />
              <StatCard icon={Car} label="Drivers" value="—" />
            </>
          ) : (
            <>
              <StatCard
                icon={BarChart3}
                label="Total submissions"
                value={totals?.all ?? "—"}
                emphasis
              />
              <StatCard
                icon={Megaphone}
                label="Campaign leads"
                value={totals?.leads ?? "—"}
                onPress={() => router.push("/(ops)/leads")}
              />
              <StatCard
                icon={Truck}
                label="Fleet partners"
                value={totals?.fleet ?? "—"}
                onPress={() => router.push("/(ops)/fleet")}
              />
              <StatCard
                icon={Car}
                label="Drivers"
                value={totals?.drivers ?? "—"}
                onPress={() => router.push("/(ops)/drivers")}
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.padded}>
        <Text style={styles.sectionLabel}>Activity</Text>
        <ActivityChart data={stats?.timeline ?? []} loading={loading} />
      </View>

      {(byType.length > 0 || driversByCity.length > 0 || loading) ? (
        <View style={styles.padded}>
          <Text style={styles.sectionLabel}>Breakdown</Text>
          <BreakdownPieSwitcher
            loading={loading}
            views={[
              {
                key: "type",
                label: "By type",
                title: "By type",
                subtitle: "Share of submissions in this period",
                items: byType,
              },
              {
                key: "city",
                label: "City distribution",
                title: "City distribution",
                subtitle: "Where driver signups are coming from",
                items: driversByCity.slice(0, 6),
              },
            ]}
          />
        </View>
      ) : null}

      <View style={styles.padded}>
        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.actions}>
          <ActionCard
            icon={Megaphone}
            label="Open leads"
            onPress={() => router.push("/(ops)/leads")}
          />
          <ActionCard
            icon={Truck}
            label="View fleet"
            onPress={() => router.push("/(ops)/fleet")}
          />
          <ActionCard
            icon={Mail}
            label="Waitlist"
            onPress={() => router.push("/(ops)/waitlist")}
          />
          <ActionCard
            icon={FileText}
            label="Media kit"
            onPress={() => router.push("/(ops)/media-kit")}
          />
        </View>
      </View>

      <View style={styles.padded}>
        <Text style={styles.sectionLabel}>Recent activity</Text>
        {recentError ? (
          <View style={styles.recentError}>
            <ApiErrorBanner
              message={recentError}
              onRetry={refetchRecent}
            />
          </View>
        ) : null}
        <View style={styles.group}>
          {recentLoading ? (
            <SkeletonListRows count={4} />
          ) : recentItems.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyText}>No recent submissions</Text>
            </View>
          ) : (
            recentItems.map((item, index) => (
              <View key={`${item.type}-${item.id}`}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={() => router.push(item.href as never)}
                  style={({ pressed }) => [
                    styles.activityRow,
                    pressed && styles.activityPressed,
                  ]}
                >
                  <View style={styles.activityDot} />
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activityDetail}>{item.subtitle}</Text>
                  </View>
                  <ChevronRight color={colors.mutedForeground} size={18} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  )
}
