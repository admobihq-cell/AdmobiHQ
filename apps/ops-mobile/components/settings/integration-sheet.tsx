import { useEffect, useMemo, useState } from "react"
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { IntegrationDto } from "@workspace/ops-contracts"
import {
  BILLING_CYCLES,
  CATEGORIES,
  CURRENCIES,
  STATUSES,
  STATUS_LABEL,
  integrationInputSchema,
} from "@workspace/ops-contracts/integration-costs"
import { createInFlightGuard } from "@workspace/ops-contracts"

import { PickerField } from "@/components/finances/picker-field"
import { DestructiveButton, Field, Label, PrimaryButton, SecondaryButton } from "@/components/ui"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

export const integrationsKey = ["ops-integrations"] as const

const CYCLE_LABEL: Record<string, string> = { monthly: "Monthly", annual: "Annual", usage: "Usage-based", free: "Free" }

type Form = {
  name: string
  category: string
  purpose: string
  url: string
  plan: string
  cost: string
  currency: string
  billing_cycle: string
  status: string
  owner: string
  notes: string
}

const EMPTY: Form = {
  name: "",
  category: "infrastructure",
  purpose: "",
  url: "",
  plan: "",
  cost: "0",
  currency: "USD",
  billing_cycle: "monthly",
  status: "active",
  owner: "",
  notes: "",
}

const fromDto = (i: IntegrationDto): Form => ({ ...i, cost: String(i.cost) })

/**
 * Add, edit or delete one integration. Validates with the schema the API and ops web use
 * (`integrationInputSchema`); the API still decides. `integration` null means add.
 */
export function IntegrationSheet({
  visible,
  integration,
  onClose,
}: {
  visible: boolean
  integration: IntegrationDto | null
  onClose: () => void
}) {
  const client = useOpsClient()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const guard = useMemo(() => createInFlightGuard(), [])
  const [form, setForm] = useState<Form>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (visible) {
      setForm(integration ? fromDto(integration) : EMPTY)
      setError(null)
    }
  }, [visible, integration])

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))
  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: integrationsKey })
    onClose()
  }

  const save = useMutation({
    mutationFn: (body: ReturnType<typeof integrationInputSchema.parse>) =>
      integration ? client.integrations.update(integration.id, body) : client.integrations.create(body),
    onSuccess: done,
    onError: (e) => setError(formatOpsError(e, API_URL)),
    onSettled: () => guard.finish(),
  })
  const remove = useMutation({
    mutationFn: () => client.integrations.remove(integration!.id),
    onSuccess: done,
    onError: (e) => {
      setConfirmDelete(false)
      setError(formatOpsError(e, API_URL))
    },
    onSettled: () => guard.finish(),
  })

  function submit() {
    if (!guard.tryStart()) return
    const parsed = integrationInputSchema.safeParse(form)
    if (!parsed.success) {
      guard.finish()
      return setError(parsed.error.issues[0]?.message ?? "Check the form and try again.")
    }
    setError(null)
    save.mutate(parsed.data)
  }

  const busy = save.isPending || remove.isPending
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
    error: { ...typography.bodySm, color: c.danger, marginBottom: spacing.sm },
  }))

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={busy ? undefined : onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>{integration ? "Edit integration" : "Add integration"}</Text>

              <Label>Name</Label>
              <Field value={form.name} onChangeText={set("name")} placeholder="e.g. Resend" editable={!busy} maxLength={120} />

              <PickerField
                label="Category"
                placeholder="Choose a category"
                options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                value={form.category}
                onSelect={set("category")}
                disabled={busy}
              />

              <Label>Cost</Label>
              <Field value={form.cost} onChangeText={set("cost")} keyboardType="decimal-pad" editable={!busy} />

              <PickerField
                label="Currency"
                placeholder="Currency"
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                value={form.currency}
                onSelect={set("currency")}
                disabled={busy}
              />
              <PickerField
                label="Billing"
                placeholder="Billing cycle"
                options={BILLING_CYCLES.map((c) => ({ value: c, label: CYCLE_LABEL[c] ?? c }))}
                value={form.billing_cycle}
                onSelect={set("billing_cycle")}
                disabled={busy}
              />
              <PickerField
                label="Status"
                placeholder="Status"
                options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s }))}
                value={form.status}
                onSelect={set("status")}
                disabled={busy}
              />

              <Label>Plan (optional)</Label>
              <Field value={form.plan} onChangeText={set("plan")} editable={!busy} maxLength={120} />
              <Label>What it is for (optional)</Label>
              <Field value={form.purpose} onChangeText={set("purpose")} editable={!busy} maxLength={300} />
              <Label>Website (optional)</Label>
              <Field value={form.url} onChangeText={set("url")} autoCapitalize="none" keyboardType="url" editable={!busy} />
              <Label>Owner (optional)</Label>
              <Field value={form.owner} onChangeText={set("owner")} editable={!busy} maxLength={120} />
              <Label>Notes (optional)</Label>
              <Field value={form.notes} onChangeText={set("notes")} multiline editable={!busy} maxLength={500} />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PrimaryButton label={save.isPending ? "Saving…" : integration ? "Save changes" : "Add integration"} onPress={submit} disabled={busy} />
              <SecondaryButton label="Cancel" onPress={onClose} disabled={busy} />
              {integration ? <DestructiveButton label="Delete" onPress={() => setConfirmDelete(true)} disabled={busy} /> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete ${integration?.name ?? "this integration"}?`}
        message="It is removed from the ledger and from the monthly totals."
        confirmLabel={remove.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={() => {
          if (guard.tryStart()) remove.mutate()
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  )
}
