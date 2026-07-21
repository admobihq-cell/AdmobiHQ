import { StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/lib/theme"

type PlaceholderScreenProps = {
  title: string
  body: string
}

export function PlaceholderScreen({ title, body }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>Coming soon</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: "flex-start",
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
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
