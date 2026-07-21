import { StyleSheet, Text, View } from "react-native"

import { EXPO_PUBLIC_API_URL, EXPO_PUBLIC_APP_URL } from "@/lib/env"
import { colors, spacing, typography } from "@/lib/theme"

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.body}>
        Account and billing preferences will land here. No sign-in in this
        scaffold.
      </Text>
      <View style={styles.meta}>
        <Text style={styles.metaLabel}>Web app</Text>
        <Text style={styles.metaValue}>
          {EXPO_PUBLIC_APP_URL ?? "http://localhost:3002"}
        </Text>
        <Text style={styles.metaLabel}>API</Text>
        <Text style={styles.metaValue}>
          {EXPO_PUBLIC_API_URL ?? "not set"}
        </Text>
      </View>
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
  meta: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  metaValue: {
    ...typography.body,
    color: colors.text,
  },
})
