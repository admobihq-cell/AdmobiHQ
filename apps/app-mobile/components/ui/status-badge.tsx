import { StyleSheet, Text, View } from "react-native"

import { colors, typography } from "@/lib/theme"

export type CampaignStatus = "active" | "scheduled" | "draft" | "completed"

const STATUS_STYLES: Record<
  CampaignStatus,
  { bg: string; text: string; label: string }
> = {
  active: { bg: "#E8F5E9", text: "#2E7D32", label: "Active" },
  scheduled: { bg: "#FFF3E0", text: "#E65100", label: "Scheduled" },
  draft: { bg: colors.secondary, text: colors.mutedForeground, label: "Draft" },
  completed: { bg: colors.muted, text: colors.mutedForeground, label: "Completed" },
}

type StatusBadgeProps = {
  status: CampaignStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const palette = STATUS_STYLES[status]

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
