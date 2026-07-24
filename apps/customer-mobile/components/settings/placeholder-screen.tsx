import { Pressable, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

type PlaceholderScreenProps = {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}

export function PlaceholderScreen({
  title,
  body,
  actionLabel,
  onAction,
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets()

  const styles = useThemedStyles((c) => ({
    scroll: {
      flex: 1,
      backgroundColor: c.bg,
    },
    container: {
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
    action: {
      marginTop: spacing.sm,
      alignSelf: "flex-start" as const,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
    },
    actionPressed: {
      opacity: 0.85,
    },
    actionText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
    },
  }))

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.badge}>Coming soon</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {actionLabel && onAction ? (
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            onPress={onAction}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  )
}
