import { Pressable, StyleSheet } from "react-native"
import { useRouter } from "expo-router"

import { Bell } from "@/components/icons"
import { radius, useThemeColors } from "@/lib/theme"

export function ActivityBellButton() {
  const router = useRouter()
  const colors = useThemeColors()

  return (
    <Pressable
      onPress={() => router.push("/(ops)/activity")}
      accessibilityRole="button"
      accessibilityLabel="Activity"
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.muted, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Bell size={18} color={colors.text} />
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
})
