import { Pressable, StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"

import { Bell } from "@/components/icons"
import { useCustomerInbox } from "@/lib/use-customer-inbox"
import { radius, useThemeColors } from "@/lib/theme"

export function NotificationBellButton() {
  const router = useRouter()
  const colors = useThemeColors()
  const { unreadCount } = useCustomerInbox()

  // read comes straight from the server on both feeds — the shared react-query
  // caches behind useCustomerInbox() mean this badge updates automatically once
  // notifications.tsx marks something read.
  const hasUnread = unreadCount > 0

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? "Notifications, new items" : "Notifications"}
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.muted, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Bell size={20} color={colors.text} />
      {hasUnread ? (
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
