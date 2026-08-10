import { Image, StyleSheet, View } from "react-native"

import { spacing } from "@/lib/theme/tokens"
import { useThemeColors } from "@/lib/theme/provider"

/**
 * Same transparent wordmark as BrandedSplashScreen, but tinted with the
 * theme's foreground color instead of the splash's cream-on-black — the
 * source PNG is cream/terracotta built for a black canvas, which disappears
 * on this screen's light background.
 */
export function AuthLogo() {
  const colors = useThemeColors()

  return (
    <View style={styles.row}>
      <Image
        source={require("@/assets/images/splash-icon.png")}
        style={[styles.mark, { tintColor: colors.text }]}
        resizeMode="contain"
        accessibilityLabel="Admobi"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  mark: {
    width: 220,
    height: 110,
  },
})
