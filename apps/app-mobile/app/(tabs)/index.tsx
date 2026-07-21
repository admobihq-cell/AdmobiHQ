import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { colors, spacing, typography } from "@/lib/theme"

export default function OverviewScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom },
      ]}
    >
      <Text style={styles.eyebrow}>Admobi</Text>
      <Text style={styles.title}>Customer overview</Text>
      <Text style={styles.body}>
        Campaign performance and account summary will live here. Open the Map
        tab for corridor coverage and proof-of-play.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
})
