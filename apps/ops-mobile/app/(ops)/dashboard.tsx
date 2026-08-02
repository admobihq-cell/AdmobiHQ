import { useMemo, useState } from "react"
import { useUser } from "@clerk/clerk-expo"
import { useRouter } from "expo-router"
import {
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
  Send,
  Truck,
  type AppIcon,
} from "@/components/icons"

import { ActionCard } from "@/components/ui/action-card"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { StatCard } from "@/components/ui/stat-card"
import { DashboardBanner } from "@/components/app/dashboard-banner"
import { BreakdownPieSwitcher } from "@/components/app/metric-bar"
import { RangeDropdown } from "@/components/app/range-dropdown"
import { SkeletonListRows } from "@/components/app/skeleton"
import { ActivityChart } from "@/components/app/sparkline"
import { FabMenu, type FabMenuItem } from "@/components/app/fab-menu"
import { getPrimaryEmail } from "@/lib/auth"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { usePageHeader } from "@/lib/page-header"
import { useRecentSubmissions } from "@/hooks/use-recent-submissions"
import { useThemeColors, spacing, typography, radius } from "@/lib/theme"
import type { RecentSubmission } from "@/hooks/use-recent-submissions"

const RANGES: Array<{ key: DateRangeKey; label: string }> = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
]

const RECENT_TYPE_ICON: Record<RecentSubmission["type"], AppIcon> = {
  lead: Megaphone,
  fleet: Truck,
  driver: Car,
}

const FAB_ITEMS: FabMenuItem[] = [
  { key: "lead", label: "New lead", icon: Megaphone, href: "/(ops)/leads/new" },
  {
    key: "fleet",
    label: "New fleet partner",
    icon: Truck,
    href: "/(ops)/fleet/new",
  },
  { key: "driver", label: "New driver", icon: Car, href: "/(ops)/drivers/new" },
  {
    key: "waitlist",
    label: "New waitlist entry",
    icon: Mail,
    href: "/(ops)/waitlist/new",
  },
  {
    key: "media-kit",
    label: "New media kit request",
    icon: FileText,
    href: "/(ops)/media-kit/new",
  },
  {
    key: "announcement",
    label: "New announcement",
    icon: Send,
    href: "/(ops)/announcements/new",
  },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function DashboardScreen() {
  usePageHeader("Dashboard")
  const colors = useThemeColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId
  )
  const rawName = user?.firstName?.trim() || email?.split("@")[0] || "there"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

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
        screen: {
          flex: 1,
        },
        scroll: {
          flex: 1,
        },
        content: {
          gap: spacing.lg,
        },
        padded: {
          paddingHorizontal: spacing.lg,
        },
        bannerWrap: {
          paddingHorizontal: spacing.lg,
        },
        recentError: {
          marginBottom: spacing.sm,
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
          gap: spacing.sm,
        },
        statsRow: {
          flexDirection: "row",
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
        activityIconWrap: {
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: colors.accentSurface,
          alignItems: "center",
          justifyContent: "center",
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
          marginLeft: spacing.md + 36 + spacing.md,
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
    [colors]
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
    <View style={styles.screen}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg + 72,
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
            <Text style={[styles.sectionLabel, styles.sectionLabelInline]}>
              Overview
            </Text>
            <RangeDropdown
              options={RANGES}
              selected={range}
              onSelect={setRange}
            />
          </View>
          <View style={styles.statsGrid}>
            {loading && !totals && !error ? (
              <>
                <View style={styles.statsRow}>
                  <StatCard icon={BarChart3} label="Total" value="—" emphasis />
                  <StatCard icon={Megaphone} label="Leads" value="—" />
                </View>
                <View style={styles.statsRow}>
                  <StatCard icon={Truck} label="Fleet" value="—" />
                  <StatCard icon={Car} label="Drivers" value="—" />
                </View>
              </>
            ) : (
              <>
                <View style={styles.statsRow}>
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
                </View>
                <View style={styles.statsRow}>
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
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.padded}>
          <Text style={styles.sectionLabel}>Activity</Text>
          <ActivityChart data={stats?.timeline ?? []} loading={loading} />
        </View>

        {byType.length > 0 || driversByCity.length > 0 || loading ? (
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
              <ApiErrorBanner message={recentError} onRetry={refetchRecent} />
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
              recentItems.map((item, index) => {
                const Icon = RECENT_TYPE_ICON[item.type]
                return (
                  <View key={`${item.type}-${item.id}`}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <Pressable
                      onPress={() => router.push(item.href as never)}
                      style={({ pressed }) => [
                        styles.activityRow,
                        pressed && styles.activityPressed,
                      ]}
                    >
                      <View style={styles.activityIconWrap}>
                        <Icon color={colors.primary} size={16} />
                      </View>
                      <View style={styles.activityCopy}>
                        <Text style={styles.activityTitle}>{item.title}</Text>
                        <Text style={styles.activityDetail}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <ChevronRight color={colors.mutedForeground} size={18} />
                    </Pressable>
                  </View>
                )
              })
            )}
          </View>
        </View>
      </ScrollView>

      <FabMenu items={FAB_ITEMS} />
    </View>
  )
}
