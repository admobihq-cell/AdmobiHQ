import { Pressable, Text, View } from "react-native"

import type { AppIcon } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type StatCardProps = {
  label: string
  value: string | number
  icon: AppIcon
  onPress?: () => void
  /** Primary-colored treatment for the headline stat in a group. */
  emphasis?: boolean
}

const LABEL_LINE_HEIGHT = 16

export function StatCard({ label, value, icon: Icon, onPress, emphasis = false }: StatCardProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    card: {
      flex: 1,
      minWidth: "46%" as const,
      padding: spacing.md,
      borderRadius: 14,
      borderWidth: emphasis ? 0 : 1,
      borderColor: c.border,
      backgroundColor: emphasis ? c.primary : c.surface,
      justifyContent: "space-between" as const,
      gap: spacing.md,
    },
    cardPressed: {
      opacity: 0.88,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.xs,
      // Fixed to two lines' worth of height so cards stay aligned in the grid
      // whether a label wraps ("Fleet partners") or not ("Drivers").
      minHeight: LABEL_LINE_HEIGHT * 2,
    },
    label: {
      ...typography.caption,
      lineHeight: LABEL_LINE_HEIGHT,
      color: emphasis ? "rgba(255,255,255,0.85)" : c.mutedForeground,
      fontWeight: "600" as const,
      flex: 1,
    },
    iconBadge: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: emphasis ? "rgba(255,255,255,0.18)" : c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    value: {
      fontSize: 27,
      fontWeight: "700" as const,
      color: emphasis ? c.primaryForeground : c.text,
      letterSpacing: -0.4,
    },
  }))

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        <View style={styles.iconBadge}>
          <Icon color={emphasis ? colors.primaryForeground : colors.primary} size={15} />
        </View>
      </View>
      <Text style={styles.value}>{value}</Text>
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
