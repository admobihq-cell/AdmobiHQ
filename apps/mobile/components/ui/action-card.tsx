import { Pressable, Text } from "react-native"

import type { AppIcon } from "@/components/icons"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type ActionCardProps = {
  label: string
  icon: AppIcon
  onPress: () => void
}

export function ActionCard({ label, icon: Icon, onPress }: ActionCardProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    card: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    cardPressed: {
      opacity: 0.75,
    },
    label: {
      ...typography.section,
      color: c.text,
    },
  }))

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Icon color={colors.primary} size={22} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}
