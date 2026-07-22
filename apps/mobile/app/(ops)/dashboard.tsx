import { useState } from "react"
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
  Truck,
} from "@/components/icons"

import { ActionCard } from "@/components/ui/action-card"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { PageHero } from "@/components/ui/page-hero"
import { StatCard } from "@/components/ui/stat-card"
import { FilterChips } from "@/components/app/filter-chips"
import { BreakdownPieSwitcher } from "@/components/app/metric-bar"
import { AvatarInitials } from "@/components/app/list-row"
import { SkeletonListRows } from "@/components/app/skeleton"
import { ActivityChart } from "@/components/app/sparkline"
import { getPrimaryEmail } from "@/lib/auth"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useRecentSubmissions } from "@/hooks/use-recent-submissions"
import { colors, spacing, typography } from "@/lib/theme"

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

  const onRefresh = async () => {
    setRefreshing(true)
    refetch()
    refetchRecent()
    setRefreshing(false)
  }

  return (
    <ScrollView
      style={styles.scroll}
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
      <View style={styles.padded}>
        <PageHero
          eyebrow={getGreeting()}
          title={`Welcome back, ${displayName}`}
          description="Operational pulse across leads, fleet, drivers, and signups."
          trailing={<AvatarInitials name={displayName} />}
        />
      </View>

      <View style={styles.section}>
        <FilterChips
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          selected={range}
          onSelect={(key) => key && setRange(key as DateRangeKey)}
          showAll={false}
        />
      </View>

      {error ? (
        <View style={styles.padded}>
          <ApiErrorBanner message={error} onRetry={refetch} />
        </View>
      ) : null}

      <View style={styles.padded}>
        <Text style={styles.sectionLabel}>Overview</Text>
        <View style={styles.statsGrid}>
          {loading && !totals && !error ? (
            <>
              <StatCard icon={BarChart3} label="Total" value="—" />
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
                hint="All types"
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
              <StatCard
                icon={Mail}
                label="Waitlist"
                value={totals?.waitlist ?? "—"}
                onPress={() => router.push("/(ops)/waitlist")}
              />
              <StatCard
                icon={FileText}
                label="Media kit"
                value={totals?.mediaKit ?? "—"}
                onPress={() => router.push("/(ops)/media-kit")}
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    gap: spacing.lg,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginTop: -spacing.sm,
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
})
