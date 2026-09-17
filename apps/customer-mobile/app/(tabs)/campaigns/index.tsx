import { useMemo, useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { CampaignDto } from "@workspace/ops-contracts"

import { SkeletonCampaignCards } from "@/components/app/skeleton"
import { CampaignCalendarView } from "@/components/calendar/campaign-calendar-view"
import { Add, Calendar, List, Location } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCampaignError, useCampaigns } from "@/lib/use-campaigns"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

/** Filters follow what an advertiser actually asks ("what's running?", "what's
 * waiting on me?"), not the raw status column. Mirrors customer-web. */
const FILTERS = [
  { label: "All", match: () => true },
  { label: "Live", match: (c: CampaignDto) => c.flight_phase === "live" },
  { label: "In queue", match: (c: CampaignDto) => c.status === "submitted" },
  { label: "Scheduled", match: (c: CampaignDto) => c.flight_phase === "scheduled" },
  {
    label: "Needs changes",
    match: (c: CampaignDto) => c.status === "rejected" || c.status === "changes_requested",
  },
  { label: "Draft", match: (c: CampaignDto) => c.status === "draft" },
] as const

type ViewMode = "list" | "calendar"

function formatBudget(value: string | null): string {
  if (!value) return "—"
  return `KES ${Number(value).toLocaleString("en-KE")}`
}

function formatFlight(campaign: CampaignDto): string {
  if (!campaign.starts_on || !campaign.ends_on) return "Not scheduled"
  return `${campaign.starts_on} → ${campaign.ends_on}`
}

export default function CampaignsScreen() {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [filter, setFilter] = useState<string>("All")
  const [mode, setMode] = useState<ViewMode>("list")

  const campaignsQuery = useCampaigns()
  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data])
  const loading = campaignsQuery.isPending

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.label === filter) ?? FILTERS[0]
    return campaigns.filter(active.match)
  }, [campaigns, filter])

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
    hero: { gap: spacing.xs },
    eyebrow: {
      ...typography.caption,
      color: c.primary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    title: { ...typography.title, color: c.text, fontSize: 26 },
    subtitle: { ...typography.body, color: c.mutedForeground, marginTop: spacing.xs },
    segment: {
      flexDirection: "row" as const,
      alignSelf: "flex-start" as const,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: 3,
      gap: 3,
    },
    segmentButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
    },
    segmentButtonActive: { backgroundColor: c.primary },
    segmentText: { ...typography.label, color: c.mutedForeground, fontWeight: "600" as const },
    segmentTextActive: { color: c.primaryForeground },
    filters: { gap: spacing.sm, paddingRight: spacing.lg },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterText: { ...typography.label, color: c.mutedForeground, fontWeight: "600" as const },
    filterTextActive: { color: c.primaryForeground },
    list: { gap: spacing.md },
    card: {
      padding: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.sm,
    },
    cardPressed: { opacity: 0.85 },
    cardHeader: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    cardTitle: { flex: 1, ...typography.section, fontSize: 17, color: c.text },
    metaRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    metaText: { ...typography.caption, color: c.mutedForeground, flex: 1 },
    metrics: {
      flexDirection: "row" as const,
      marginTop: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    metric: { flex: 1, gap: 2 },
    metricLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    metricValue: { ...typography.section, color: c.text },
    metricDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: spacing.md,
    },
    emptyState: {
      alignItems: "flex-start" as const,
      gap: spacing.xs,
      padding: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
    },
    emptyTitle: { ...typography.label, color: c.text, fontWeight: "700" as const },
    emptyText: { ...typography.bodySm, color: c.mutedForeground },
    fab: {
      position: "absolute" as const,
      right: spacing.lg,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 999,
      backgroundColor: c.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    fabPressed: { opacity: 0.9 },
    fabLabel: { ...typography.section, color: c.primaryForeground },
  }))

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={campaignsQuery.isRefetching}
            onRefresh={() => void campaignsQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Workspace</Text>
          <Text style={styles.title}>Campaigns</Text>
          <Text style={styles.subtitle}>
            Create, schedule, and monitor out-of-home flights. Every campaign is reviewed by our
            team before it goes live.
          </Text>
        </View>

        <View style={styles.segment}>
          <Pressable
            onPress={() => setMode("list")}
            style={[styles.segmentButton, mode === "list" && styles.segmentButtonActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "list" }}
          >
            <List
              color={mode === "list" ? colors.primaryForeground : colors.mutedForeground}
              size={15}
            />
            <Text style={[styles.segmentText, mode === "list" && styles.segmentTextActive]}>
              List
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("calendar")}
            style={[styles.segmentButton, mode === "calendar" && styles.segmentButtonActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "calendar" }}
          >
            <Calendar
              color={mode === "calendar" ? colors.primaryForeground : colors.mutedForeground}
              size={15}
            />
            <Text style={[styles.segmentText, mode === "calendar" && styles.segmentTextActive]}>
              Calendar
            </Text>
          </Pressable>
        </View>

        {campaignsQuery.error ? (
          <ApiErrorBanner
            message={formatCampaignError(campaignsQuery.error)}
            onRetry={() => void campaignsQuery.refetch()}
          />
        ) : null}

        {mode === "calendar" ? (
          loading ? (
            <SkeletonCampaignCards count={3} />
          ) : (
            <CampaignCalendarView campaigns={campaigns} />
          )
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {FILTERS.map((item) => {
                const active = filter === item.label
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => setFilter(item.label)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {loading ? (
              <SkeletonCampaignCards count={4} />
            ) : visible.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {campaigns.length === 0 ? "No campaigns yet" : `Nothing matches "${filter}"`}
                </Text>
                <Text style={styles.emptyText}>
                  {campaigns.length === 0
                    ? "Build your first flight — brief, dates, budget, and creative — and send it for review."
                    : "Try another filter."}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {visible.map((campaign) => (
                  <Pressable
                    key={campaign.id}
                    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                    onPress={() => router.push(`/campaigns/${campaign.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${campaign.name}, ${campaign.status}`}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{campaign.name}</Text>
                      <StatusBadge
                        status={campaign.status}
                        flightPhase={campaign.flight_phase}
                      />
                    </View>

                    <View style={styles.metaRow}>
                      <Location color={colors.mutedForeground} size={14} />
                      <Text style={styles.metaText}>{campaign.market ?? "Market not set"}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Calendar color={colors.mutedForeground} size={14} />
                      <Text style={styles.metaText}>{formatFlight(campaign)}</Text>
                    </View>

                    <View style={styles.metrics}>
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Creative</Text>
                        <Text style={styles.metricValue}>
                          {campaign.creatives.length} file
                          {campaign.creatives.length === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Budget</Text>
                        <Text style={styles.metricValue}>
                          {formatBudget(campaign.budget_kes)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.lg },
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push("/campaigns/new")}
        accessibilityRole="button"
        accessibilityLabel="New campaign"
      >
        <Add color={colors.primaryForeground} size={24} />
        <Text style={styles.fabLabel}>New campaign</Text>
      </Pressable>
    </View>
  )
}
