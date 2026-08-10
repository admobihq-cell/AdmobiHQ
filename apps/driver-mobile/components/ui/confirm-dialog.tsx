import { Modal, Pressable, Text } from "react-native"

import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

type ConfirmDialogProps = {
  visible: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Custom confirm/cancel dialog — not `Alert.alert`, whose multi-button
 * `buttons` array doesn't render an interactive dialog on react-native-web.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: { ...typography.headline, color: c.text },
    message: { ...typography.body, color: c.mutedForeground },
    confirmButton: {
      alignItems: "center" as const,
      borderRadius: radius.md,
      paddingVertical: 12,
      backgroundColor: destructive ? c.destructive : c.primary,
    },
    confirmLabel: {
      ...typography.body,
      fontWeight: "700" as const,
      color: destructive ? "#FFFFFF" : c.primaryForeground,
    },
    cancelButton: {
      alignItems: "center" as const,
      borderRadius: radius.md,
      paddingVertical: 12,
    },
    cancelLabel: { ...typography.body, fontWeight: "600" as const, color: c.mutedForeground },
    pressed: { opacity: 0.85 },
  }))

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={styles.card}
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
            onPress={onConfirm}
            accessibilityRole="button"
          >
            <Text style={styles.confirmLabel}>{confirmLabel}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            onPress={onCancel}
            accessibilityRole="button"
          >
            <Text style={styles.cancelLabel}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
