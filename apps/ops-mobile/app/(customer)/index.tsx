import { Clock } from "@/components/icons"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Card, Eyebrow, IconBox } from "@/components/ui"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

/**
 * Stub for non-staff Clerk sessions on the Ops Expo app.
 * Customer product lives in apps/customer-mobile (no Clerk).
 */
export default function CustomerComingSoonScreen() {
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.bg,
      paddingHorizontal: spacing.lg,
      justifyContent: "center" as const,
      gap: spacing.md,
    },
    title: {
      ...typography.display,
      color: c.text,
    },
    card: {
      marginVertical: spacing.sm,
    },
    body: {
      ...typography.body,
      color: c.mutedForeground,
    },
  }))

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
          (`apps/customer-mobile`) and on the web at app.admobihq.com. This Ops app is
          for @admobihq.com staff only.
        </Text>
      </Card>
    </View>
  )
}
