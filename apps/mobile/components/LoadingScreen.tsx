import { ActivityIndicator, StyleSheet, Text, View } from "react-native"

import { Eyebrow } from "@/components/ui"
import { colors, spacing } from "@/lib/theme"

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Eyebrow>Admobi Ops</Eyebrow>
      <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
      <Text style={styles.label}>Loading workspace…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  spinner: {
    marginTop: spacing.lg,
  },
  label: {
    color: colors.mutedForeground,
    fontSize: 14,
    marginTop: spacing.md,
  },
})
