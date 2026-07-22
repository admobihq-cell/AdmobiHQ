import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing, typography } from "@/lib/theme"

type ApiErrorBannerProps = {
  message: string
  onDismiss?: () => void
  onRetry?: () => void
}

export function ApiErrorBanner({
  message,
  onDismiss,
  onRetry,
}: ApiErrorBannerProps) {
  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.message}>{message}</Text>
      {onRetry || onDismiss ? (
        <View style={styles.actions}>
          {onRetry ? (
            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          ) : null}
          {onDismiss ? (
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
            >
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: "rgba(192, 74, 47, 0.08)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  message: {
    ...typography.bodySm,
    color: colors.danger,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  action: {
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  retryText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.danger,
  },
  dismissText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
})
