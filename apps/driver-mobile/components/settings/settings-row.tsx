import { Pressable, Text, View } from "react-native"

import { ChevronRight, type AppIcon } from "@/components/icons"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type SettingsRowProps = {
  label: string
  description?: string
  icon: AppIcon
  onPress: () => void
}

export function SettingsRow({
  label,
  description,
  icon: Icon,
  onPress,
}: SettingsRowProps) {
  const colors = useThemeColors()
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
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    label: {
      ...typography.section,
      color: c.text,
    },
    description: {
      ...typography.caption,
      color: c.mutedForeground,
    },
  }))

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.iconWrap}>
        <Icon color={colors.primary} size={20} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      <ChevronRight color={colors.mutedForeground} size={18} />
    </Pressable>
  )
}
