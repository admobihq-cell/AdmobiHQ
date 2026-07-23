import { StyleSheet, Text, View } from "react-native"

import { typography, useThemeColors } from "@/lib/theme"

export type CampaignStatus = "active" | "scheduled" | "draft" | "completed"

type StatusBadgeProps = {
  status: CampaignStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useThemeColors()
  const statusStyles: Record<
    CampaignStatus,
    { bg: string; text: string; label: string }
  > = {
    active: {
      bg: `${colors.success}1A`,
      text: colors.success,
      label: "Active",
    },
    scheduled: {
      bg: `${colors.primary}1A`,
      text: colors.primary,
      label: "Scheduled",
    },
    draft: {
      bg: colors.secondary,
      text: colors.mutedForeground,
      label: "Draft",
    },
    completed: {
      bg: colors.muted,
      text: colors.mutedForeground,
      label: "Completed",
    },
  }
  const palette = statusStyles[status]

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>{palette.label}</Text>
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
