import { Text, View } from "react-native"

import { radius, typography, useThemedStyles } from "@/lib/theme"

export type StatusChipVariant =
  | "default"
  | "primary"
  | "muted"
  | "attention"
  | "progress"
  | "success"

type StatusChipProps = {
  label: string
  variant?: StatusChipVariant
}

export function StatusChip({ label, variant = "default" }: StatusChipProps) {
  const styles = useThemedStyles((c) => ({
    chip: {
      alignSelf: "flex-start" as const,
      backgroundColor: c.accent,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    chipPrimary: {
      backgroundColor: `${c.primary}1F`,
    },
    chipMuted: {
      backgroundColor: c.muted,
    },
    chipAttention: {
      backgroundColor: `${c.primary}24`,
    },
    chipProgress: {
      backgroundColor: c.accent,
    },
    chipSuccess: {
      backgroundColor: `${c.success}22`,
    },
    text: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.text,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    textPrimary: {
      color: c.primary,
    },
    textMuted: {
      color: c.mutedForeground,
    },
    textAttention: {
      color: c.primary,
    },
    textProgress: {
      color: c.text,
    },
    textSuccess: {
      color: c.success,
    },
  }))

  return (
    <View
      style={[
        styles.chip,
        variant === "primary" && styles.chipPrimary,
        variant === "muted" && styles.chipMuted,
        variant === "attention" && styles.chipAttention,
        variant === "progress" && styles.chipProgress,
        variant === "success" && styles.chipSuccess,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "primary" && styles.textPrimary,
          variant === "muted" && styles.textMuted,
          variant === "attention" && styles.textAttention,
          variant === "progress" && styles.textProgress,
          variant === "success" && styles.textSuccess,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}
