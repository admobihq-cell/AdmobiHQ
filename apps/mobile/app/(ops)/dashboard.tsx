import { useUser } from "@clerk/clerk-expo"
import { useRouter } from "expo-router"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import {
  Car,
  FileText,
  Mail,
  Megaphone,
  Truck,
} from "@/components/icons"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { FilterChips } from "@/components/app/filter-chips"
import { GroupedList, GroupedSection } from "@/components/app/grouped-list"
import { KpiScroller } from "@/components/app/kpi-scroller"
import { LargeTitleScreen } from "@/components/app/large-title-screen"
import { ListRow } from "@/components/app/list-row"
import { MetricBarList } from "@/components/app/metric-bar"
import { SkeletonListRows } from "@/components/app/skeleton"
import { Sparkline } from "@/components/app/sparkline"
import { AvatarInitials } from "@/components/app/list-row"
import { getPrimaryEmail } from "@/lib/auth"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useRecentSubmissions } from "@/hooks/use-recent-submissions"
import { colors, radius, spacing, typography } from "@/lib/theme"

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
  const { user } = useUser()
  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId,
  )
  const rawName =
    user?.firstName?.trim() || email?.split("@")[0] || "there"
  const displayName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const { stats, loading, error, range, setRange } = useDashboardStats("30d")
  const {
    items: recentItems,
    loading: recentLoading,
    error: recentError,
  } = useRecentSubmissions(8)

  const totals = stats?.overview.totals

  const kpiItems = totals
    ? [
        {
          key: "leads",
          label: "Leads",
          value: totals.leads,
          onPress: () => router.push("/(ops)/leads"),
        },
        {
          key: "fleet",
          label: "Fleet",
          value: totals.fleet,
          onPress: () => router.push("/(ops)/fleet"),
        },
        {
          key: "drivers",
          label: "Drivers",
          value: totals.drivers,
          onPress: () => router.push("/(ops)/drivers"),
        },
        {
          key: "waitlist",
          label: "Waitlist",
          value: totals.waitlist,
          onPress: () => router.push("/(ops)/waitlist"),
        },
        {
          key: "mediaKit",
          label: "Media kit",
          value: totals.mediaKit,
          onPress: () => router.push("/(ops)/media-kit"),
        },
      ]
    : []

  return (
    <LargeTitleScreen
      title="Dashboard"
      subtitle={`${getGreeting()}, ${displayName}`}
      headerRight={
        <Pressable onPress={() => router.push("/(ops)/more")}>
          <AvatarInitials name={displayName} />
        </Pressable>
      }
    >
      <View style={styles.section}>
        <FilterChips
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          selected={range}
          onSelect={(key) => key && setRange(key as DateRangeKey)}
          showAll={false}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Overview</Text>
        <KpiScroller items={kpiItems} loading={loading} />
      </View>

      <View style={[styles.section, styles.padded]}>
        <Sparkline
          data={stats?.timeline ?? []}
          loading={loading}
        />
      </View>

      {stats?.overview.byType.length ? (
        <View style={[styles.section, styles.padded]}>
          <GroupedSection title="By type">
            <View style={styles.metricPadding}>
              <MetricBarList items={stats.overview.byType} />
            </View>
          </GroupedSection>
        </View>
      ) : null}

      {stats?.overview.driversByCity.length ? (
        <View style={[styles.section, styles.padded]}>
          <GroupedSection title="Drivers by city">
            <View style={styles.metricPadding}>
              <MetricBarList
                items={stats.overview.driversByCity.slice(0, 6)}
              />
            </View>
          </GroupedSection>
        </View>
      ) : null}

      <View style={[styles.section, styles.padded]}>
        <GroupedSection title="Recent">
          {recentLoading ? (
            <SkeletonListRows count={4} />
          ) : recentError ? (
            <Text style={styles.error}>{recentError}</Text>
          ) : recentItems.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyText}>No recent submissions</Text>
            </View>
          ) : (
            <GroupedList>
              {recentItems.map((item) => (
                <ListRow
                  key={`${item.type}-${item.id}`}
                  title={item.title}
                  subtitle={item.subtitle}
                  initials={item.title}
                  onPress={() => router.push(item.href as never)}
                />
              ))}
            </GroupedList>
          )}
        </GroupedSection>
      </View>

      <View style={[styles.section, styles.padded]}>
        <Text style={styles.sectionLabel}>Quick access</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcuts}
        >
          <ShortcutButton
            icon={Mail}
            label="Waitlist"
            onPress={() => router.push("/(ops)/waitlist")}
          />
          <ShortcutButton
            icon={FileText}
            label="Media kit"
            onPress={() => router.push("/(ops)/media-kit")}
          />
          <ShortcutButton
            icon={Megaphone}
            label="Leads"
            onPress={() => router.push("/(ops)/leads")}
          />
          <ShortcutButton
            icon={Truck}
            label="Fleet"
            onPress={() => router.push("/(ops)/fleet")}
          />
          <ShortcutButton
            icon={Car}
            label="Drivers"
            onPress={() => router.push("/(ops)/drivers")}
          />
        </ScrollView>
      </View>
    </LargeTitleScreen>
  )
}

function ShortcutButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Mail
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
    >
      <View style={styles.shortcutIcon}>
        <Icon color={colors.primary} size={20} strokeWidth={2} />
      </View>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
  },
  metricPadding: {
    padding: spacing.md,
  },
  error: {
    color: colors.danger,
    ...typography.bodySm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyRecent: {
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.mutedForeground,
  },
  shortcuts: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  shortcut: {
    alignItems: "center",
    width: 72,
    gap: spacing.xs,
  },
  shortcutPressed: {
    opacity: 0.7,
  },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.mutedForeground,
    textAlign: "center",
  },
})
