import { Pressable, Text, View } from "react-native"

import { ChevronRight, type AppIcon } from "@/components/icons"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type SettingsRowProps = {
  label: string
  description?: string
  icon: AppIcon
  onPress: () => void
  /** Tints icon, label, and chevron with the destructive color — for sign-out and other irreversible actions. */
  destructive?: boolean
  /** Hide the trailing chevron for rows that act immediately rather than navigate. */
  showChevron?: boolean
  disabled?: boolean
}

export function SettingsRow({
  label,
  description,
  icon: Icon,
  onPress,
  destructive = false,
  showChevron = true,
  disabled = false,
}: SettingsRowProps) {
  const colors = useThemeColors()
  const tint = destructive ? colors.destructive : colors.primary
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: destructive ? c.destructiveMuted : c.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    label: {
      ...typography.section,
      color: destructive ? c.destructive : c.text,
    },
    description: {
      ...typography.caption,
      color: c.mutedForeground,
    },
  }))

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.iconWrap}>
        <Icon color={tint} size={20} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {showChevron ? <ChevronRight color={colors.mutedForeground} size={18} /> : null}
    </Pressable>
  )
}
