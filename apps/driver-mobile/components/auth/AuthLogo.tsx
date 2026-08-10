import { Image, StyleSheet, Text, View } from "react-native"

import { spacing } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"

// Same mark + wordmark pairing as @workspace/ui's <Logo> (used on the
// customer-web / driver-web auth pages) — logo-mark.png is 85x47 native.
const MARK_HEIGHT = 32
const MARK_WIDTH = Math.round((85 / 47) * MARK_HEIGHT)

export function AuthLogo() {
  const styles = useThemedStyles((c) => ({
    text: { fontSize: 20, fontWeight: "600" as const, letterSpacing: -0.2, color: c.text },
  }))

  return (
    <View style={rootStyles.row}>
      <Image
        source={require("@/assets/images/logo-mark.png")}
        style={{ width: MARK_WIDTH, height: MARK_HEIGHT }}
        resizeMode="contain"
        accessibilityLabel="Admobi"
      />
      <Text style={styles.text}>Admobi</Text>
    </View>
  )
}

const rootStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
})
