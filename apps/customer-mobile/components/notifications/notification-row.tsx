import { Pressable, Text, View } from "react-native"

import { NOTIFICATION_CATEGORY_ICONS, type NotificationItem } from "@/lib/notifications-data"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type NotificationRowProps = {
  item: NotificationItem
  onPress: () => void
}

export function NotificationRow({ item, onPress }: NotificationRowProps) {
  const colors = useThemeColors()
  const Icon = NOTIFICATION_CATEGORY_ICONS[item.category]

  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: "flex-start" as const,
    },
    rowPressed: { opacity: 0.7 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: item.read ? c.muted : c.accentSurface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
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
      <View style={styles.iconWrap}>
        <Icon color={item.read ? colors.mutedForeground : colors.primary} size={18} />
      </View>
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
