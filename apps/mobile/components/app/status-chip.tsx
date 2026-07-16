import { StyleSheet, Text, View } from "react-native"

import { colors, radius, typography } from "@/lib/theme"

type StatusChipProps = {
  label: string
  variant?: "default" | "primary" | "muted"
}

export function StatusChip({ label, variant = "default" }: StatusChipProps) {
  return (
    <View
      style={[
        styles.chip,
        variant === "primary" && styles.chipPrimary,
        variant === "muted" && styles.chipMuted,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "primary" && styles.textPrimary,
          variant === "muted" && styles.textMuted,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipPrimary: {
    backgroundColor: "rgba(155, 69, 37, 0.12)",
  },
  chipMuted: {
    backgroundColor: colors.muted,
  },
  text: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.text,
  },
  textPrimary: {
    color: colors.primary,
  },
  textMuted: {
    color: colors.mutedForeground,
  },
})
