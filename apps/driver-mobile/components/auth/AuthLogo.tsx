import { Image, StyleSheet, Text, View } from "react-native"

import { radius, spacing } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"

export function AuthLogo() {
  const styles = useThemedStyles((c) => ({
    text: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.2, color: c.text },
  }))

  return (
    <View style={rootStyles.row}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={rootStyles.mark}
        resizeMode="contain"
        accessibilityLabel="Admobi"
      />
      <Text style={styles.text}>Admobi Driver</Text>
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
  mark: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
  },
})
