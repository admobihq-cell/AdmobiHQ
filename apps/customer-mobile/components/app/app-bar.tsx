import { Image, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { NotificationBellButton } from "@/components/notifications/notification-bell-button"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { radius, spacing, useThemeColors } from "@/lib/theme"

/** Persistent top bar shown above every tab — brand, notifications, and theme access that used to live only on the Overview tab and scroll out of view. */
export function AppBar() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.brand}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.mark}
          resizeMode="contain"
          accessibilityLabel="Admobi"
        />
        <Text style={[styles.brandName, { color: colors.text }]}>Admobi</Text>
      </View>
      <View style={styles.actions}>
        <NotificationBellButton />
        <ThemeToggleButton />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
})
