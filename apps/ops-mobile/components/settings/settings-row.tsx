import { Pressable, Text, View } from "react-native"

import { ChevronRight, type AppIcon } from "@/components/icons"
import { IconBox } from "@/components/ui"
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
} from "@/lib/theme"

type SettingsRowProps = {
  label: string
  description?: string
  icon: AppIcon
  onPress?: () => void
  destructive?: boolean
  showChevron?: boolean
}

export function SettingsRow({
  label,
  description,
  icon: Icon,
  onPress,
  destructive = false,
  showChevron = !!onPress,
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
    destructive: {
      color: c.destructive,
    },
  }))

  const content = (
    <>
      <IconBox
        icon={Icon}
        size={20}
        boxSize={36}
        cornerRadius={radius.md}
        backgroundColor={colors.secondary}
        bordered={false}
        iconColor={destructive ? colors.destructive : colors.primary}
      />
      <View style={styles.copy}>
        <Text style={[styles.label, destructive && styles.destructive]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {showChevron ? (
        <ChevronRight color={colors.mutedForeground} size={18} />
      ) : null}
    </>
  )

  if (!onPress) {
    return <View style={styles.row}>{content}</View>
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  )
}
