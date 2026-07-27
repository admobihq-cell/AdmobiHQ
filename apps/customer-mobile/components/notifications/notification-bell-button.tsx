import { Pressable, StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"

import { Bell } from "@/components/icons"
import { INITIAL_NOTIFICATIONS } from "@/lib/notifications-data"
import { radius, useThemeColors } from "@/lib/theme"

export function NotificationBellButton() {
  const router = useRouter()
  const colors = useThemeColors()
  const unreadCount = INITIAL_NOTIFICATIONS.filter((item) => !item.read).length

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
      }
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.muted, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Bell size={20} color={colors.text} />
      {unreadCount > 0 ? (
        <View
          style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.bg }]}
        />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
})
