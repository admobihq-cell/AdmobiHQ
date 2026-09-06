import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { CampaignFormat } from "@workspace/ops-contracts"

import { SkeletonCampaignCards } from "@/components/app/skeleton"
import { CampaignReviewBanner } from "@/components/campaigns/campaign-review-banner"
import { CreativePicker } from "@/components/campaigns/creative-picker"
import { Calendar, Location, Pencil, Radio } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCampaignError, useCampaign } from "@/lib/use-campaigns"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const FORMAT_LABELS: Record<string, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Taxi-top LED + delivery bike",
}

const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

function formatKes(value: string | null): string {
  if (!value) return "—"
  return `KES ${Number(value).toLocaleString("en-KE")}`
}

export default function CampaignDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const parsedId = Number.parseInt(rawId ?? "", 10)
  const id = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null

  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const campaignQuery = useCampaign(id)
  const campaign = campaignQuery.data ?? null

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.xl },
    header: { gap: spacing.sm },
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    name: { ...typography.title, color: c.text, flex: 1 },
    metaRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
    metaText: { ...typography.bodySm, color: c.mutedForeground, flex: 1 },
    editButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      alignSelf: "flex-start" as const,
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    editText: { ...typography.label, color: c.text, fontWeight: "600" as const },
    card: {
      padding: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.md,
    },
    cardTitle: { ...typography.section, color: c.text },
    metricsRow: { flexDirection: "row" as const },
    metric: { flex: 1, gap: 2 },
    metricLabel: { ...typography.caption, color: c.mutedForeground, fontWeight: "600" as const },
    metricValue: { ...typography.title, fontSize: 18, color: c.text },
    metricDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: spacing.md,
    },
    detailRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
    },
    detailLabel: { ...typography.bodySm, color: c.mutedForeground },
    detailValue: {
      ...typography.bodySm,
      color: c.text,
      fontWeight: "600" as const,
      flexShrink: 1,
      textAlign: "right" as const,
    },
    section: { gap: spacing.sm },
    empty: { ...typography.bodySm, color: c.mutedForeground },
  }))

  // A disabled query stays `isPending` forever, so a junk id has to be caught
  // before the loading branch or the screen never resolves.
  if (id != null && campaignQuery.isPending) {
    return (
      <View style={styles.scroll}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonCampaignCards count={2} />
        </View>
      </View>
    )
  }

  if (!campaign) {
    return (
      <View style={styles.scroll}>
        <View style={{ padding: spacing.lg }}>
          <ApiErrorBanner
            message={
              campaignQuery.error
                ? formatCampaignError(campaignQuery.error)
                : "This campaign isn't available on your account."
            }
            onRetry={() => void campaignQuery.refetch()}
          />
        </View>
      </View>
    )
  }

  const editable = EDITABLE_STATUSES.has(campaign.status)
  const flight =
    campaign.starts_on && campaign.ends_on
      ? `${campaign.starts_on} → ${campaign.ends_on}`
      : "Not scheduled"

  const detailRows: Array<[string, string]> = [
    ["Market", campaign.market ?? "—"],
    ["Flight", flight],
    ["Format", FORMAT_LABELS[campaign.format] ?? campaign.format],
    ["Objective", campaign.objective ?? "—"],
    ["Corridors", campaign.corridors ?? "—"],
  ]

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={campaignQuery.isRefetching}
          onRefresh={() => void campaignQuery.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Stack.Screen options={{ title: campaign.name }} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{campaign.name}</Text>
          <StatusBadge status={campaign.status} flightPhase={campaign.flight_phase} />
        </View>
        <View style={styles.metaRow}>
          <Location color={colors.mutedForeground} size={14} />
          <Text style={styles.metaText}>{campaign.market ?? "Market not set"}</Text>
        </View>
        <View style={styles.metaRow}>
          <Calendar color={colors.mutedForeground} size={14} />
          <Text style={styles.metaText}>{flight}</Text>
        </View>
        <View style={styles.metaRow}>
          <Radio color={colors.mutedForeground} size={14} />
          <Text style={styles.metaText}>
            {FORMAT_LABELS[campaign.format] ?? campaign.format}
          </Text>
        </View>
        {editable ? (
          <Pressable
            style={styles.editButton}
            onPress={() =>
              router.push({ pathname: "/campaigns/new", params: { id: String(campaign.id) } })
            }
            accessibilityRole="button"
          >
            <Pencil color={colors.text} size={14} />
            <Text style={styles.editText}>Edit and resubmit</Text>
          </Pressable>
        ) : null}
      </View>

      <CampaignReviewBanner campaign={campaign} />

      <View style={styles.card}>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Budget</Text>
            <Text style={styles.metricValue}>{formatKes(campaign.budget_kes)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Creative</Text>
            <Text style={styles.metricValue}>
              {campaign.creatives.length} file{campaign.creatives.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Flight details</Text>
        {detailRows.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.cardTitle}>Creative</Text>
        {campaign.creatives.length === 0 && !editable ? (
          <Text style={styles.empty}>No creative uploaded.</Text>
        ) : (
          <CreativePicker
            campaignId={campaign.id}
            format={campaign.format as CampaignFormat}
            creatives={campaign.creatives}
            disabled={!editable}
          />
        )}
      </View>
    </ScrollView>
  )
}
