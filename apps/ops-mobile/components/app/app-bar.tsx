import { Image, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useUser } from "@clerk/clerk-expo"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AvatarInitials } from "@/components/app/list-row"
import { ActivityBellButton } from "@/components/activity/activity-bell-button"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { getPrimaryEmail } from "@/lib/auth"
import { radius, spacing, useThemeColors } from "@/lib/theme"

/** Persistent top bar shown above every ops tab — brand, activity, theme, and account access that used to live only on the dashboard and scroll out of view. */
export function AppBar() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()

  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId
  )
  const rawName = user?.firstName?.trim() || email?.split("@")[0] || "there"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

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
        <Text style={[styles.brandName, { color: colors.text }]}>
          Admobi Ops
        </Text>
      </View>
      <View style={styles.actions}>
        <ActivityBellButton />
        <ThemeToggleButton />
        <AvatarInitials
          name={displayName}
          onPress={() => router.push("/(ops)/profile")}
          size={32}
        />
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
