import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useUser } from "@clerk/clerk-expo"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AvatarInitials } from "@/components/app/list-row"
import { ActivityBellButton } from "@/components/activity/activity-bell-button"
import { ChevronLeft } from "@/components/icons"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { getPrimaryEmail } from "@/lib/auth"
import { usePageHeaderState } from "@/lib/page-header"
import { radius, spacing, useThemeColors } from "@/lib/theme"

/** Persistent top bar shown above every ops screen — brand/back plus the current section or record name, and activity/theme/account access that used to live only on the dashboard and scroll out of view. */
export function AppBar() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()
  const { title, showBack, backHref } = usePageHeaderState()

  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId
  )
  const rawName = user?.firstName?.trim() || email?.split("@")[0] || "there"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const goBack = () => {
    // Prefer the screen's declared parent over router.canGoBack(): entity
    // detail screens are reached via an absolute-path push from a list row,
    // and canGoBack() isn't a reliable signal for those — it can report no
    // history even right after a real push, which sent "back" to Dashboard
    // instead of the list the user actually came from.
    if (backHref) {
      router.replace(backHref as never)
      return
    }
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/(ops)/dashboard")
  }

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
        {showBack ? (
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <ChevronLeft color={colors.primary} size={24} strokeWidth={2.25} />
          </Pressable>
        ) : (
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.mark}
            resizeMode="contain"
            accessibilityLabel="Admobi"
          />
        )}
        <Text
          style={[styles.brandName, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
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
    flex: 1,
    minWidth: 0,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
})
