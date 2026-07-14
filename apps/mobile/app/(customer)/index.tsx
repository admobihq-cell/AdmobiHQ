import { useAuth } from "@clerk/clerk-expo"
import { Clock } from "@/components/icons"
import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Card, Eyebrow, IconBox, SecondaryButton } from "@/components/ui"
import { colors, spacing, typography } from "@/lib/theme"

export default function CustomerComingSoonScreen() {
  const { signOut } = useAuth()
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
      <Text style={styles.title}>Customer app coming soon</Text>
      <Card style={styles.card}>
        <Text style={styles.body}>
          Campaigns, reports, and settings will land here once the web product is
          live. Staff ops lives in the ops stack for @admobihq.com accounts.
        </Text>
      </Card>
      <SecondaryButton label="Sign out" onPress={() => void signOut()} />
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
