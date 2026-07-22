import { Text, View } from "react-native"

import { radius, typography, useThemedStyles } from "@/lib/theme"

type StatusChipProps = {
  label: string
  variant?: "default" | "primary" | "muted"
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
  }))

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
