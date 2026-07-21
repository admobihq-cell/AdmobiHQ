import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Add, Calendar, Location } from "@/components/icons"
import {
  StatusBadge,
  type CampaignStatus,
} from "@/components/ui/status-badge"
import { colors, spacing, typography } from "@/lib/theme"

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

const FILTERS = ["All", "Active", "Scheduled", "Draft"] as const
type Filter = (typeof FILTERS)[number]

export default function CampaignsScreen() {
  const insets = useSafeAreaInsets()
  const [filter, setFilter] = useState<Filter>("All")

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
      >
        <Add color={colors.primaryForeground} size={24} />
        <Text style={styles.fabLabel}>New campaign</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
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
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  title: {
    ...typography.title,
    color: colors.text,
    fontSize: 26,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    ...typography.label,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  filterTextActive: {
    color: colors.primaryForeground,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    ...typography.section,
    fontSize: 17,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: colors.mutedForeground,
    flex: 1,
  },
  metrics: {
    flexDirection: "row",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  metricValue: {
    ...typography.section,
    color: colors.text,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.primary,
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
    color: colors.primaryForeground,
  },
})
