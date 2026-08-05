import { useCallback, useState } from "react"
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Calendar, Location, Radio } from "@/components/icons"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatLabelFor, getCampaignById, type Campaign } from "@/lib/campaigns"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

/** Deterministic illustrative spend-to-date, not a real ledger — matches this app's other placeholder metrics. */
const SPEND_FRACTION: Record<Campaign["status"], number> = {
  active: 0.64,
  scheduled: 0,
  draft: 0,
  completed: 1,
}

function parseKes(budget: string): number {
  return Number(budget.replace(/[^0-9]/g, "")) || 0
}

function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString("en-KE")}`
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      let mounted = true
      setLoading(true)
      void getCampaignById(id).then((result) => {
        if (mounted) {
          setCampaign(result)
          setLoading(false)
        }
      })
      return () => {
        mounted = false
      }
    }, [id]),
  )

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.lg, gap: spacing.xl },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    header: { gap: spacing.sm },
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    name: { ...typography.title, color: c.text, flex: 1 },
    metaRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
    metaText: { ...typography.bodySm, color: c.mutedForeground },
    localNote: {
      ...typography.caption,
      color: c.primary,
      backgroundColor: `${c.primary}14`,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: "flex-start" as const,
    },
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
    metricValue: { ...typography.title, fontSize: 20, color: c.text },
    metricDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: spacing.md,
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: c.muted,
      overflow: "hidden" as const,
    },
    progressFill: {
      height: "100%" as const,
      borderRadius: 999,
      backgroundColor: c.primary,
    },
    progressLabel: { ...typography.caption, color: c.mutedForeground },
    detailRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
    },
    detailLabel: { ...typography.bodySm, color: c.mutedForeground },
    detailValue: { ...typography.bodySm, color: c.text, fontWeight: "600" as const },
    disclaimer: { ...typography.caption, color: c.mutedForeground },
  }))

  if (loading) {
    return (
      <View style={[styles.scroll, styles.center]}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!campaign) {
    return (
      <View style={[styles.scroll, styles.center, { padding: spacing.lg }]}>
        <Text style={styles.metaText}>This campaign isn&apos;t available on this device.</Text>
      </View>
    )
  }

  const budgetKes = parseKes(campaign.budget)
  const spendFraction = SPEND_FRACTION[campaign.status]
  const spendKes = budgetKes * spendFraction
  const screensReached = Math.max(1, Math.round((budgetKes / 1000) * 0.8))
  const dailyPlays = Math.max(0, Math.round(screensReached * spendFraction * 6))

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: campaign.name }} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{campaign.name}</Text>
          <StatusBadge status={campaign.status} />
        </View>
        <View style={styles.metaRow}>
          <Location color={colors.mutedForeground} size={14} />
          <Text style={styles.metaText}>{campaign.market}</Text>
        </View>
        <View style={styles.metaRow}>
          <Calendar color={colors.mutedForeground} size={14} />
          <Text style={styles.metaText}>{campaign.dates}</Text>
        </View>
        <View style={styles.metaRow}>
          <Radio color={colors.mutedForeground} size={14} />
          <Text style={styles.metaText}>{formatLabelFor(campaign.format)}</Text>
        </View>
        {campaign.createdLocally ? (
          <Text style={styles.localNote}>Created on this device</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Budget &amp; spend</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Budget</Text>
            <Text style={styles.metricValue}>{campaign.budget}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Spent to date</Text>
            <Text style={styles.metricValue}>{formatKes(spendKes)}</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(spendFraction * 100)}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{Math.round(spendFraction * 100)}% of budget used</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Proof-of-play</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Impressions</Text>
            <Text style={styles.metricValue}>{campaign.impressions}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Screens reached</Text>
            <Text style={styles.metricValue}>{screensReached}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Avg. daily plays</Text>
            <Text style={styles.metricValue}>{dailyPlays}</Text>
          </View>
        </View>
        <Text style={styles.disclaimer}>
          GPS-verified proof-of-play populates here once the flight is live.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Flight details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Market</Text>
          <Text style={styles.detailValue}>{campaign.market}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Schedule</Text>
          <Text style={styles.detailValue}>{campaign.dates}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Format</Text>
          <Text style={styles.detailValue}>{formatLabelFor(campaign.format)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{campaign.status}</Text>
        </View>
      </View>
    </ScrollView>
  )
}
