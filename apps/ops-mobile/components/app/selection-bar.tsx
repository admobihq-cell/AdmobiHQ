import { useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { bulkReviewSummary, createInFlightGuard, type BulkReviewResult } from "@workspace/ops-contracts"

import { Check, X } from "@/components/icons"
import { DestructiveButton, Field, PrimaryButton, SecondaryButton } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type Decision = "approve" | "reject"

/**
 * The bar that appears while rows are selected on a review queue: the count, Approve and Reject.
 * Both go through a confirm that states the count; Reject needs one reason, shown to every row it
 * applies to (the web rule). `noun` is "campaigns" or "applications".
 */
export function SelectionBar({
  count,
  noun,
  onApprove,
  onReject,
  onClear,
  onDone,
}: {
  count: number
  noun: string
  onApprove: () => Promise<BulkReviewResult>
  onReject: (reason: string) => Promise<BulkReviewResult>
  onClear: () => void
  /** Called with the banner text ("2 approved, 1 skipped (not in review)") once the batch has been sent. */
  onDone: (summary: string, ok: boolean) => void
}) {
  const colors = useThemeColors()
  const [open, setOpen] = useState<Decision | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A second tap lands before `busy` re-renders: the latch is synchronous, so a batch is never sent twice.
  const guard = useRef(createInFlightGuard()).current

  const styles = useThemedStyles((c) => ({
    bar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    count: { ...typography.body, color: c.text, fontWeight: "600" as const, flex: 1 },
    action: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    actionText: { ...typography.body, color: c.text, fontWeight: "600" as const },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center" as const, justifyContent: "center" as const, padding: spacing.lg },
    card: { width: "100%" as const, maxWidth: 360, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg },
    title: { ...typography.headline, color: c.text, marginBottom: spacing.xs },
    message: { ...typography.body, color: c.mutedForeground, marginBottom: spacing.md },
    label: { ...typography.body, color: c.text, fontWeight: "600" as const, marginBottom: 6 },
    error: { ...typography.body, color: c.destructive, marginBottom: spacing.sm },
  }))

  const close = () => {
    if (busy) return
    setOpen(null)
    setReason("")
    setError(null)
  }

  const run = async () => {
    if (!open || !guard.tryStart()) return
    const decision = open === "approve" ? "approved" : "rejected"
    setBusy(true)
    setError(null)
    try {
      const result = open === "approve" ? await onApprove() : await onReject(reason.trim())
      setOpen(null)
      setReason("")
      onDone(bulkReviewSummary(decision, result), result.updated.length > 0)
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      guard.finish()
      setBusy(false)
    }
  }

  const verb = open === "approve" ? "Approve" : "Reject"
  const canSend = !busy && (open === "approve" || reason.trim().length > 0)

  return (
    <>
      <View style={styles.bar}>
        <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear selection">
          <X color={colors.mutedForeground} size={20} />
        </Pressable>
        <Text style={styles.count}>{count} selected</Text>
        <Pressable style={styles.action} onPress={() => setOpen("approve")} accessibilityRole="button" accessibilityLabel={`Approve ${count} ${noun}`}>
          <Check color={colors.text} size={16} strokeWidth={2.25} />
          <Text style={styles.actionText}>Approve</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => setOpen("reject")} accessibilityRole="button" accessibilityLabel={`Reject ${count} ${noun}`}>
          <X color={colors.text} size={16} strokeWidth={2.25} />
          <Text style={styles.actionText}>Reject</Text>
        </Pressable>
      </View>

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.backdrop} onPress={close}>
            <Pressable style={styles.card} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
              <Text style={styles.title}>
                {verb} {count} {noun}?
              </Text>
              <Text style={styles.message}>
                Only items still in review change; anything already decided is skipped. Each one gets its usual email and notification.
              </Text>
              {open === "reject" ? (
                <>
                  <Text style={styles.label}>Reason (shown to each of them)</Text>
                  <Field value={reason} onChangeText={setReason} multiline maxLength={2000} style={{ minHeight: 96, textAlignVertical: "top" }} accessibilityLabel="Reason for rejecting" />
                </>
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {busy ? <ActivityIndicator style={{ marginBottom: spacing.sm }} /> : null}
              {open === "reject" ? (
                <DestructiveButton label={`Reject ${count}`} onPress={() => void run()} disabled={!canSend} />
              ) : (
                <PrimaryButton label={`Approve ${count}`} onPress={() => void run()} disabled={!canSend} />
              )}
              <SecondaryButton label="Cancel" onPress={close} disabled={busy} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}
