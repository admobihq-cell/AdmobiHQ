import { Pressable, StyleSheet, Text, View } from "react-native"

import type { AppIcon } from "@/components/icons"
import { colors, spacing, typography } from "@/lib/theme"

type ActionCardProps = {
  label: string
  icon: AppIcon
  onPress: () => void
}

export function ActionCard({ label, icon: Icon, onPress }: ActionCardProps) {
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

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: 0.75,
  },
  label: {
    ...typography.section,
    color: colors.text,
  },
})
