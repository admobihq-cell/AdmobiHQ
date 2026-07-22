import { Text, View } from "react-native"

import { spacing, typography, useThemedStyles } from "@/lib/theme"

type PlaceholderScreenProps = {
  title: string
  body: string
}

export function PlaceholderScreen({ title, body }: PlaceholderScreenProps) {
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.bg,
      padding: spacing.lg,
    },
    card: {
      padding: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.sm,
    },
    badge: {
      alignSelf: "flex-start" as const,
      ...typography.caption,
      color: c.primary,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
    },
    title: {
      ...typography.title,
      color: c.text,
    },
    body: {
      ...typography.body,
      color: c.mutedForeground,
    },
  }))

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
