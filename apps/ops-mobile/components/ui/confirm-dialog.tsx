import { Modal, Pressable, Text } from "react-native"

import { DestructiveButton, PrimaryButton, SecondaryButton } from "@/components/ui"
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
 * Custom confirm/cancel dialog — deliberately not `Alert.alert`, whose
 * multi-button `buttons` array doesn't render an interactive dialog on
 * react-native-web. Reuses the app's existing Modal + backdrop pattern
 * (see BottomSheetPicker) so it behaves the same on native and web.
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
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    title: {
      ...typography.headline,
      color: c.text,
      marginBottom: message ? spacing.xs : 0,
    },
    message: {
      ...typography.body,
      color: c.mutedForeground,
    },
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
          {destructive ? (
            <DestructiveButton label={confirmLabel} onPress={onConfirm} />
          ) : (
            <PrimaryButton label={confirmLabel} onPress={onConfirm} />
          )}
          <SecondaryButton label={cancelLabel} onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}
