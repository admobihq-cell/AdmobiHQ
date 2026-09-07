import { useUser } from "@clerk/clerk-expo"
import { useMemo } from "react"
import { useRouter } from "expo-router"
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { CampaignDto } from "@workspace/ops-contracts"

import { SkeletonListRows, SkeletonStatCards } from "@/components/app/skeleton"
import { Campaigns, Map, Radio, Time, TrendingUp, Warning } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { StatCard } from "@/components/ui/stat-card"
import { WalletPreviewCard } from "@/components/wallet/wallet-preview-card"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { formatRelativeTime } from "@/lib/notifications-data"
import { spacing, typography, useThemeColors } from "@/lib/theme"
import { formatCampaignError, useCampaigns } from "@/lib/use-campaigns"
import { useCustomerInbox } from "@/lib/use-customer-inbox"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
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

/**
 * Every number here is derived from the two feeds this app already has —
 * `/v1/customer/campaigns` and the merged inbox. Mirrors customer-web's
 * `OverviewView` deliberately, so the two surfaces can't disagree about what
 * "live" or "committed" means. Impressions, delivery rate and spend are absent
 * on purpose: nothing serves them yet, and an invented number on a dashboard
 * is worse than a missing one.
 */
const NEEDS_YOU = new Set(["draft", "rejected", "changes_requested"])

function summarize(campaigns: CampaignDto[]) {
  const live = campaigns.filter((c) => c.flight_phase === "live").length
  const scheduled = campaigns.filter((c) => c.flight_phase === "scheduled").length
  const inReview = campaigns.filter((c) => c.status === "submitted").length
  const needsYou = campaigns.filter((c) => NEEDS_YOU.has(c.status)).length
  // Only approved flights count as committed — a draft's budget is a guess
  // until our team agrees to run it.
  const approved = campaigns.filter((c) => c.status === "approved")
  const committed = approved.reduce((total, c) => total + Number(c.budget_kes ?? 0), 0)

  return { live, scheduled, inReview, needsYou, committed, approved: approved.length }
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

export default function OverviewScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUserIfEnabled()

  const campaignsQuery = useCampaigns()
  const inbox = useCustomerInbox()

  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data])
  const stats = useMemo(() => summarize(campaigns), [campaigns])
  const recent = useMemo(() => inbox.items.slice(0, 5), [inbox.items])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flex: 1 },
        content: { gap: spacing.lg, paddingHorizontal: spacing.lg },
        hero: { gap: spacing.sm },
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
        activityDotRead: {
          backgroundColor: colors.border,
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
        empty: {
          alignItems: "center",
          gap: spacing.xs,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
        },
        emptyTitle: {
          ...typography.section,
          color: colors.text,
        },
        emptyBody: {
          ...typography.caption,
          color: colors.mutedForeground,
          textAlign: "center",
          lineHeight: 18,
        },
      }),
    [colors],
  )

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={campaignsQuery.isRefetching}
          onRefresh={() => {
            void campaignsQuery.refetch()
            void inbox.refetch()
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>
          {user?.firstName ? `${getGreeting()}, ${user.firstName}` : getGreeting()}
        </Text>
        <Text style={styles.heroTitle}>Your campaigns at a glance</Text>
        <Text style={styles.heroBody}>
          What&apos;s in market right now, what&apos;s with our review team, and what&apos;s
          waiting on you.
        </Text>
      </View>

      <WalletPreviewCard />

      {campaignsQuery.error ? (
        <ApiErrorBanner
          message={formatCampaignError(campaignsQuery.error)}
          onRetry={() => void campaignsQuery.refetch()}
        />
      ) : null}

      {campaignsQuery.isPending ? (
        <SkeletonStatCards count={4} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard
            icon={Radio}
            label="Live now"
            value={String(stats.live)}
            hint={stats.scheduled > 0 ? `${plural(stats.scheduled, "flight")} scheduled` : undefined}
          />
          <StatCard
            icon={Time}
            label="In review"
            value={String(stats.inReview)}
            hint={stats.inReview > 0 ? "With our team" : undefined}
          />
          <StatCard
            icon={Warning}
            label="Needs you"
            value={String(stats.needsYou)}
            hint={stats.needsYou > 0 ? "Drafts and change requests" : undefined}
          />
          <StatCard
            icon={TrendingUp}
            label="Committed budget"
            value={`KES ${stats.committed.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`}
            hint={
              stats.approved > 0 ? `Across ${plural(stats.approved, "approved flight")}` : undefined
            }
          />
        </View>
      )}

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
          {inbox.loading ? (
            <SkeletonListRows count={3} />
          ) : recent.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing has happened yet</Text>
              <Text style={styles.emptyBody}>
                Submit a campaign and every review decision, schedule change, and announcement
                lands here.
              </Text>
            </View>
          ) : (
            recent.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  style={({ pressed }) => [styles.activityRow, pressed && styles.actionPressed]}
                  disabled={!item.href}
                  onPress={() => {
                    void inbox.markRead(item)
                    if (item.href) router.push(item.href as never)
                  }}
                >
                  <View style={[styles.activityDot, item.read && styles.activityDotRead]} />
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activityDetail} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>{formatRelativeTime(item.createdAt)}</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  )
}
