import { useState } from "react"
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMutation } from "@tanstack/react-query"
import { formatKes, refundFormError, type RecordOptionsDto } from "@workspace/ops-contracts"

import { Field, Label, PrimaryButton, SecondaryButton } from "@/components/ui"
import { PickerField } from "@/components/finances/picker-field"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { useRefreshFinance } from "@/lib/use-finance"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

/**
 * Refund unused credit to the advertiser's original M-Pesa number or card. The API decides the split
 * across payments and refuses more than the org's available balance. The form checks the same rules
 * as ops web (`refundFormError`); the button is disabled while a refund is in flight so a double tap
 * can't send it twice.
 */
export function RefundSheet({
  visible,
  onClose,
  orgs,
}: {
  visible: boolean
  onClose: () => void
  orgs: RecordOptionsDto["orgs"]
}) {
  const client = useOpsClient()
  const insets = useSafeAreaInsets()
  const refresh = useRefreshFinance()
  const [orgId, setOrgId] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setOrgId("")
    setAmount("")
    setReason("")
    setError(null)
  }
  const close = () => {
    reset()
    onClose()
  }

  const refund = useMutation({
    mutationFn: (body: { orgId: number; amountKes: number; reason: string }) => client.finance.refund(body),
    onSuccess: async ({ refundIds }) => {
      await refresh()
      close()
      Alert.alert("Refund sent to Paystack", `${refundIds.length} payment${refundIds.length === 1 ? "" : "s"} refunded.`)
    },
    onError: (e) => setError(formatOpsError(e, API_URL)),
  })

  function submit() {
    const problem = refundFormError({ orgId, amount, reason })
    if (problem) return setError(problem)
    setError(null)
    refund.mutate({ orgId: Number(orgId), amountKes: Number(amount), reason: reason.trim() })
  }

  const amountKes = Number(amount)
  const styles = useThemedStyles((c) => ({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" as const },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: insets.bottom + spacing.lg,
      maxHeight: "90%" as const,
    },
    title: { ...typography.headline, color: c.text, marginBottom: spacing.xs },
    help: { ...typography.bodySm, color: c.mutedForeground, marginBottom: spacing.md },
    hint: { ...typography.caption, color: c.mutedForeground, marginTop: -spacing.sm, marginBottom: spacing.md },
    error: { ...typography.bodySm, color: c.danger, marginBottom: spacing.sm },
  }))

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={refund.isPending ? undefined : close}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={refund.isPending ? undefined : close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>Refund unused credit</Text>
              <Text style={styles.help}>
                Goes back to the original M-Pesa number or card, newest payment first. The balance drops now; Paystack can
                take up to 10 business days. Money paid by bank transfer is refunded outside the system and recorded as
                &ldquo;Refund to payer&rdquo;.
              </Text>

              <PickerField
                label="Organization"
                placeholder="Choose an organization"
                options={orgs.map((o) => ({ value: String(o.id), label: o.name }))}
                value={orgId}
                onSelect={setOrgId}
                disabled={refund.isPending}
              />

              <Label>Amount (KES)</Label>
              <Field
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="decimal-pad"
                editable={!refund.isPending}
              />
              <Text style={styles.hint}>At most the org&rsquo;s available balance.</Text>

              <Label>Reason</Label>
              <Field
                value={reason}
                onChangeText={setReason}
                placeholder="Support case #123: unused credit"
                multiline
                numberOfLines={3}
                editable={!refund.isPending}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PrimaryButton
                label={refund.isPending ? "Sending…" : amountKes > 0 ? `Refund ${formatKes(amountKes)}` : "Refund"}
                onPress={submit}
                disabled={refund.isPending}
              />
              <SecondaryButton label="Cancel" onPress={close} disabled={refund.isPending} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
