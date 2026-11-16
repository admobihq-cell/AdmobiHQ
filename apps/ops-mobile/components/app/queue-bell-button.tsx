import { Pressable, StyleSheet, Text } from "react-native"
import { useRouter } from "expo-router"

import { Bell } from "@/components/icons"
import { useActionQueue } from "@/lib/use-action-queue"
import { radius, useThemeColors } from "@/lib/theme"

/** The header bell: opens the attention queue and shows how many things need someone. */
export function QueueBellButton() {
  const router = useRouter()
  const colors = useThemeColors()
  const total = (useActionQueue().data ?? []).reduce((sum, item) => sum + item.count, 0)

  return (
    <Pressable
      onPress={() => router.push("/(ops)/notifications")}
      accessibilityRole="button"
      accessibilityLabel={total > 0 ? `Needs attention, ${total} items` : "Needs attention"}
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.muted, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Bell size={18} color={colors.text} />
      {total > 0 ? (
        <Text style={[styles.badge, { backgroundColor: colors.destructive }]}>{total > 99 ? "99+" : total}</Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
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
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    overflow: "hidden",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
})
