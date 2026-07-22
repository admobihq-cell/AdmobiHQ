import { Pressable, Text, View } from "react-native"

import type { AppIcon } from "@/components/icons"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type StatCardProps = {
  label: string
  value: string | number
  hint?: string
  icon: AppIcon
  onPress?: () => void
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  onPress,
}: StatCardProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    card: {
      flex: 1,
      minWidth: "46%" as const,
      padding: spacing.md,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: 4,
    },
    cardPressed: {
      opacity: 0.85,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: c.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: spacing.xs,
    },
    value: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: c.text,
      letterSpacing: -0.3,
    },
    label: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    hint: {
      ...typography.caption,
      color: c.primary,
      fontWeight: "600" as const,
    },
  }))

  const content = (
    <>
      <View style={styles.iconWrap}>
        <Icon color={colors.primary} size={18} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {content}
      </Pressable>
    )
  }

  return <View style={styles.card}>{content}</View>
}
