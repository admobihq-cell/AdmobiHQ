import { Pressable, StyleSheet } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useTheme } from "@/lib/theme/provider"
import { radius, spacing } from "@/lib/theme/tokens"

type ThemeToggleButtonProps = {
  size?: number
}

export function ThemeToggleButton({ size = 22 }: ThemeToggleButtonProps) {
  const { colors, resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const label = isDark ? "Switch to light mode" : "Switch to dark mode"

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.muted, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={isDark ? "sunny-outline" : "moon-outline"}
        size={size}
        color={colors.text}
      />
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
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
})
