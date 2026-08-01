import { Pressable, Text, View } from "react-native"

import { ACTIVITY_CATEGORY_ICONS, type ActivityItem } from "@/lib/activity-feed"
import { IconBox } from "@/components/ui"
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
} from "@/lib/theme"

type ActivityRowProps = {
  item: ActivityItem
  onPress: () => void
}

export function ActivityRow({ item, onPress }: ActivityRowProps) {
  const colors = useThemeColors()
  const Icon = ACTIVITY_CATEGORY_ICONS[item.category]

  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: "flex-start" as const,
    },
    rowPressed: { opacity: 0.7 },
    copy: { flex: 1, gap: 2 },
    titleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
    },
    title: {
      ...typography.section,
      color: c.text,
      flex: 1,
      fontWeight: item.read ? ("500" as const) : ("700" as const),
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    body: {
      ...typography.caption,
      color: c.mutedForeground,
      lineHeight: 18,
    },
    time: {
      ...typography.caption,
      color: c.mutedForeground,
      marginTop: 2,
    },
  }))

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <IconBox
        icon={Icon}
        size={18}
        boxSize={36}
        cornerRadius={radius.md}
        backgroundColor={item.read ? colors.muted : colors.accentSurface}
        bordered={false}
        iconColor={item.read ? colors.mutedForeground : colors.primary}
      />
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.read ? null : <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </Pressable>
  )
}
