import { Clock } from "@/components/icons"
import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Card, Eyebrow, IconBox } from "@/components/ui"
import { colors, spacing, typography } from "@/lib/theme"

/**
 * Stub for non-staff Clerk sessions on the Ops Expo app.
 * Customer product lives in apps/app-mobile (no Clerk).
 */
export default function CustomerComingSoonScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom },
      ]}
    >
      <IconBox icon={Clock} size={22} />
      <Eyebrow>Admobi</Eyebrow>
      <Text style={styles.title}>Use the customer app</Text>
      <Card style={styles.card}>
        <Text style={styles.body}>
          Campaigns, maps, and settings ship in the separate customer Expo app
          (`apps/app-mobile`) and on the web at app.admobihq.com. This Ops app is
          for @admobihq.com staff only.
        </Text>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  card: {
    marginVertical: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.mutedForeground,
  },
})
