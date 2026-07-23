import { useState } from "react"
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Add, Calendar, Location } from "@/components/icons"
import {
  StatusBadge,
  type CampaignStatus,
} from "@/components/ui/status-badge"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type Campaign = {
  id: string
  name: string
  status: CampaignStatus
  market: string
  dates: string
  impressions: string
  budget: string
}

const CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    name: "Nairobi CBD Summer",
    status: "active",
    market: "CBD · 4 corridors",
    dates: "Jun 1 – Aug 31",
    impressions: "482k",
    budget: "KES 180k",
  },
  {
    id: "2",
    name: "Westlands Retail Push",
    status: "active",
    market: "Westlands · 3 corridors",
    dates: "Jul 1 – Sep 15",
    impressions: "318k",
    budget: "KES 145k",
  },
  {
    id: "3",
    name: "Karen Estate Awareness",
    status: "scheduled",
    market: "Karen · 6 corridors",
    dates: "Starts Aug 4",
    impressions: "—",
    budget: "KES 95k",
  },
  {
    id: "4",
    name: "Mombasa Rd Commute",
    status: "draft",
    market: "Mombasa Rd · 2 corridors",
    dates: "Not scheduled",
    impressions: "—",
    budget: "KES 60k",
  },
]

const FILTERS = ["All", "Active", "Scheduled", "Draft", "Completed"] as const
type Filter = (typeof FILTERS)[number]

export default function CampaignsScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [filter, setFilter] = useState<Filter>("All")
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.lg,
      gap: spacing.lg,
    },
    hero: {
      gap: spacing.xs,
    },
    eyebrow: {
      ...typography.caption,
      color: c.primary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    title: {
      ...typography.title,
      color: c.text,
      fontSize: 26,
    },
    subtitle: {
      ...typography.body,
      color: c.mutedForeground,
      marginTop: spacing.xs,
    },
    filters: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterText: {
      ...typography.label,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    filterTextActive: {
      color: c.primaryForeground,
    },
    list: {
      gap: spacing.md,
    },
    card: {
      padding: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.sm,
    },
    cardPressed: {
      opacity: 0.85,
    },
    cardHeader: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    cardTitle: {
      flex: 1,
      ...typography.section,
      fontSize: 17,
      color: c.text,
    },
    metaRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    metaText: {
      ...typography.caption,
      color: c.mutedForeground,
      flex: 1,
    },
    metrics: {
      flexDirection: "row" as const,
      marginTop: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    metric: {
      flex: 1,
      gap: 2,
    },
    metricLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    metricValue: {
      ...typography.section,
      color: c.text,
    },
    metricDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: spacing.md,
    },
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
    fabPressed: {
      opacity: 0.9,
    },
    fabLabel: {
      ...typography.section,
      color: c.primaryForeground,
    },
  }))

  const visible = CAMPAIGNS.filter((campaign) => {
    if (filter === "All") return true
    return campaign.status === filter.toLowerCase()
  })

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Workspace</Text>
          <Text style={styles.title}>Campaigns</Text>
          <Text style={styles.subtitle}>
            Create, schedule, and monitor out-of-home flights. Placeholder data
            for layout preview.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => {
            const active = filter === item
            return (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {item}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={styles.list}>
          {visible.map((campaign) => (
            <Pressable
              key={campaign.id}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() =>
                Alert.alert(
                  campaign.name,
                  "Campaign details are coming soon in a future update.",
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`${campaign.name}, ${campaign.status}`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{campaign.name}</Text>
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

              <View style={styles.metrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Impressions</Text>
                  <Text style={styles.metricValue}>{campaign.impressions}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Budget</Text>
                  <Text style={styles.metricValue}>{campaign.budget}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.lg },
          pressed && styles.fabPressed,
        ]}
        onPress={() =>
          Alert.alert(
            "New campaign",
            "Creating campaigns from the app is coming soon.",
          )
        }
        accessibilityRole="button"
        accessibilityLabel="New campaign"
      >
        <Add color={colors.primaryForeground} size={24} />
        <Text style={styles.fabLabel}>New campaign</Text>
      </Pressable>
    </View>
  )
}
