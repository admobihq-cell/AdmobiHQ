import { StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/lib/theme"

export default function CampaignsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campaigns</Text>
      <Text style={styles.body}>
        Create and manage out-of-home flights from this workspace. Coming soon.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.mutedForeground,
  },
})
