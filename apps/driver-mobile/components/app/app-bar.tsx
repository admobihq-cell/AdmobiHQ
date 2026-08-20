import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Menu } from "@/components/icons"
import { NotificationBellButton } from "@/components/notifications/notification-bell-button"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { radius, spacing, useThemeColors } from "@/lib/theme"

/** Persistent top bar shown above every tab — brand, theme access, and the menu button that opens NavDrawer for tabs that don't fit the bottom bar. */
export function AppBar({ onMenuPress }: { onMenuPress: () => void }) {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: colors.bg,
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
        <Text style={[styles.brandName, { color: colors.text }]}>Admobi Driver</Text>
      </View>
      <View style={styles.actions}>
        <NotificationBellButton />
        <ThemeToggleButton />
        <Pressable
          onPress={onMenuPress}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          hitSlop={10}
          style={({ pressed }) => [
            styles.menuButton,
            { backgroundColor: colors.muted, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Menu size={20} color={colors.text} />
        </Pressable>
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
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: Platform.OS === "android" ? 3 : 0,
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
  menuButton: {
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
})
