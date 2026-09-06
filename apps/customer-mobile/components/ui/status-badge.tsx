import { StyleSheet, Text, View } from "react-native"
import type { CampaignFlightPhase } from "@workspace/ops-contracts"

import { typography, useThemeColors } from "@/lib/theme"

/**
 * Advertisers see one badge combining two facts: an approved campaign shows
 * where it sits in its flight (Scheduled / Live / Completed), and everything
 * else shows where it sits in review. Ops sees the raw status instead — a
 * reviewer needs "submitted", an advertiser is better served by "In queue".
 *
 * Mirrors apps/customer-web/components/campaign-status-badge.tsx; keep the
 * labels identical or the two apps disagree about the same campaign.
 */

const REVIEW_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "In queue",
  rejected: "Rejected",
  changes_requested: "Changes needed",
  cancelled: "Cancelled",
}

const PHASE_LABELS: Record<CampaignFlightPhase, string> = {
  live: "Live",
  scheduled: "Scheduled",
  completed: "Completed",
  unscheduled: "Approved",
}

export function campaignBadgeLabel(status: string, flightPhase: CampaignFlightPhase): string {
  if (status === "approved") return PHASE_LABELS[flightPhase]
  return REVIEW_LABELS[status] ?? status.replace(/_/g, " ")
}

export function StatusBadge({
  status,
  flightPhase,
}: {
  status: string
  flightPhase: CampaignFlightPhase
}) {
  const colors = useThemeColors()

  const palette = ((): { bg: string; text: string } => {
    if (status === "approved") {
      if (flightPhase === "live") return { bg: `${colors.success}1A`, text: colors.success }
      if (flightPhase === "scheduled") return { bg: `${colors.primary}1A`, text: colors.primary }
      return { bg: colors.muted, text: colors.mutedForeground }
    }
    if (status === "submitted") return { bg: `${colors.primary}1A`, text: colors.primary }
    if (status === "rejected" || status === "changes_requested") {
      return { bg: `${colors.danger}14`, text: colors.danger }
    }
    return { bg: colors.secondary, text: colors.mutedForeground }
  })()

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>
        {campaignBadgeLabel(status, flightPhase)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    ...typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
})
