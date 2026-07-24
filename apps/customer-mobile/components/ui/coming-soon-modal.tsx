import { Modal, Pressable, Text, View } from "react-native"

import { Add } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type ComingSoonModalProps = {
  visible: boolean
  title: string
  body: string
  onClose: () => void
}

export function ComingSoonModal({
  visible,
  title,
  body,
  onClose,
}: ComingSoonModalProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: spacing.lg,
    },
    card: {
      width: "100%" as const,
      maxWidth: 360,
      padding: spacing.lg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.sm,
    },
    badgeRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    badge: {
      alignSelf: "flex-start" as const,
      ...typography.caption,
      color: c.primary,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
    },
    closeButton: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      transform: [{ rotate: "45deg" as const }],
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
      alignSelf: "stretch" as const,
      alignItems: "center" as const,
      backgroundColor: c.primary,
      borderRadius: radius.md,
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.card}
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
        >
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>Coming soon</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Add color={colors.mutedForeground} size={16} />
            </Pressable>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
