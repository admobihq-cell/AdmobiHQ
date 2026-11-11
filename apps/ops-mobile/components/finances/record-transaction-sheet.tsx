import { useMemo, useState } from "react"
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMutation } from "@tanstack/react-query"
import {
  LEDGER_KIND_HELP,
  LEDGER_KIND_LABEL,
  SPEND_CATEGORIES,
  SPEND_CATEGORY_LABELS,
  WALLET_TRANSACTION_KINDS,
  parseRecordTransactionForm,
  type RecordOptionsDto,
  type RecordTransactionInput,
  type WalletTransactionKind,
} from "@workspace/ops-contracts"

import { Field, Label, PrimaryButton, SecondaryButton } from "@/components/ui"
import { PickerField } from "@/components/finances/picker-field"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { useRefreshFinance } from "@/lib/use-finance"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

const NONE = "none"

/**
 * Record a wallet ledger row by hand. The ledger is append-only, so a mistake is corrected with an
 * adjustment, not an edit. The form parses with the same function ops web uses
 * (`parseRecordTransactionForm`); the API still decides. The button is disabled while saving.
 */
export function RecordTransactionSheet({
  visible,
  onClose,
  options,
}: {
  visible: boolean
  onClose: () => void
  options: RecordOptionsDto
}) {
  const client = useOpsClient()
  const insets = useSafeAreaInsets()
  const refresh = useRefreshFinance()
  const [orgId, setOrgId] = useState("")
  const [kind, setKind] = useState<WalletTransactionKind>("top_up")
  const [amount, setAmount] = useState("")
  const [campaignId, setCampaignId] = useState(NONE)
  const [category, setCategory] = useState(NONE)
  const [reference, setReference] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const campaigns = useMemo(() => options.campaigns.filter((c) => String(c.orgId) === orgId), [options.campaigns, orgId])
  const needsCategory = kind === "spend" || kind === "refund"

  const reset = () => {
    setOrgId("")
    setKind("top_up")
    setAmount("")
    setCampaignId(NONE)
    setCategory(NONE)
    setReference("")
    setReason("")
    setError(null)
  }
  const close = () => {
    reset()
    onClose()
  }

  const record = useMutation({
    mutationFn: (body: RecordTransactionInput) => client.finance.recordTransaction(body),
    onSuccess: async () => {
      await refresh()
      close()
      Alert.alert("Transaction recorded")
    },
    onError: (e) => setError(formatOpsError(e, API_URL)),
  })

  function submit() {
    const parsed = parseRecordTransactionForm({
      orgId,
      kind,
      amount,
      campaignId: campaignId === NONE ? null : campaignId,
      category: category === NONE ? null : category,
      reference,
      reason,
    })
    if ("error" in parsed) return setError(parsed.error)
    setError(null)
    record.mutate(parsed.data)
  }

  const busy = record.isPending
  const styles = useThemedStyles((c) => ({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" as const },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: insets.bottom + spacing.lg,
      maxHeight: "92%" as const,
    },
    title: { ...typography.headline, color: c.text, marginBottom: spacing.md },
    hint: { ...typography.caption, color: c.mutedForeground, marginTop: spacing.xs, marginBottom: spacing.md },
    error: { ...typography.bodySm, color: c.danger, marginBottom: spacing.sm },
  }))

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={busy ? undefined : close}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={busy ? undefined : close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>Record a transaction</Text>

              <PickerField
                label="Organization"
                placeholder="Choose an organization"
                options={options.orgs.map((o) => ({ value: String(o.id), label: o.name }))}
                value={orgId}
                onSelect={(next) => {
                  setOrgId(next)
                  setCampaignId(NONE)
                }}
                disabled={busy}
              />

              <PickerField
                label="Type"
                placeholder="Choose a type"
                options={WALLET_TRANSACTION_KINDS.map((k) => ({ value: k, label: LEDGER_KIND_LABEL[k] }))}
                value={kind}
                onSelect={(next) => setKind(next as WalletTransactionKind)}
                disabled={busy}
              />

              <Label>Amount (KES)</Label>
              <Field
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="numbers-and-punctuation"
                editable={!busy}
              />
              <Text style={styles.hint}>{LEDGER_KIND_HELP[kind]}</Text>

              <PickerField
                label="Campaign (optional)"
                title="Campaign"
                placeholder={orgId ? "None" : "Choose an organization first"}
                options={[{ value: NONE, label: "None" }, ...campaigns.map((c) => ({ value: String(c.id), label: c.name }))]}
                value={campaignId}
                onSelect={setCampaignId}
                disabled={busy || !orgId}
              />

              <PickerField
                label={needsCategory ? "Category" : "Category (optional)"}
                title="Category"
                placeholder="None"
                options={[
                  { value: NONE, label: "None" },
                  ...SPEND_CATEGORIES.map((c) => ({ value: c, label: SPEND_CATEGORY_LABELS[c] })),
                ]}
                value={category}
                onSelect={setCategory}
                disabled={busy}
              />

              <Label>Reference (optional)</Label>
              <Field
                value={reference}
                onChangeText={setReference}
                placeholder="M-Pesa code or invoice number"
                autoCapitalize="characters"
                editable={!busy}
              />

              <Label>Reason</Label>
              <Field
                value={reason}
                onChangeText={setReason}
                placeholder="Why this entry is being made"
                multiline
                numberOfLines={3}
                editable={!busy}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PrimaryButton label={busy ? "Saving…" : "Record transaction"} onPress={submit} disabled={busy} />
              <SecondaryButton label="Cancel" onPress={close} disabled={busy} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
