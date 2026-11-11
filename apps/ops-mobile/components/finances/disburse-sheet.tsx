import { useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMutation, useQuery } from "@tanstack/react-query"
import { OpsApiError } from "@workspace/ops-api-client"
import {
  createInFlightGuard,
  disburseBalanceCheck,
  disburseReceiptTitle,
  formatKes,
  parseBalanceShortBody,
  settleDisburse,
  type DisburseBatchItem,
  type DisburseOutcome,
} from "@workspace/ops-contracts"

import { PrimaryButton, SecondaryButton } from "@/components/ui"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { useRefreshFinance } from "@/lib/use-finance"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

type Receipt = DisburseOutcome & { at: Date }

/**
 * Sends the chosen payouts through Paystack Transfers. Money leaves the Paystack balance as soon as
 * this is confirmed, so: the live balance is read when the sheet opens; Send is disabled when it can't
 * cover the total plus fees, or can't be read; a second tap is turned away before it renders; and the
 * receipt says exactly what was and wasn't sent (never "Payouts sent" unless every row went).
 * Needs the `payouts` permission: the caller only offers it to people who hold it.
 */
export function DisburseSheet({
  visible,
  onClose,
  batch,
}: {
  visible: boolean
  onClose: () => void
  batch: DisburseBatchItem[]
}) {
  const client = useOpsClient()
  const insets = useSafeAreaInsets()
  const refresh = useRefreshFinance()
  const guard = useMemo(() => createInFlightGuard(), [])
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalKes = batch.reduce((sum, b) => sum + b.amountKes, 0)
  const feesKes = batch.reduce((sum, b) => sum + b.feeKes, 0)

  // The live balance, read fresh each time the sheet opens. No retry: an unreadable balance pauses sending.
  const balance = useQuery({
    queryKey: ["ops-finance", "disburse-balance"],
    queryFn: () => client.finance.paystackBalance(),
    enabled: visible && receipt === null,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
  const checking = balance.isFetching
  const check = disburseBalanceCheck(balance.data?.balanceKes ?? null, totalKes, feesKes)

  const send = useMutation({
    mutationFn: () => client.payouts.disburse(batch.map((b) => b.id)),
    onSuccess: async (result) => {
      setReceipt({ ...settleDisburse(batch, result), at: new Date() })
      await refresh()
    },
    onError: (e) => {
      // The balance can drop between the check and the send. Show the API's own numbers when it says so.
      const short = e instanceof OpsApiError && e.status === 402 ? parseBalanceShortBody(e.body) : null
      setError(
        short
          ? `The Paystack balance is ${formatKes(short.balanceKes)}, and ${formatKes(short.requiredKes)} is needed. Top up the balance first.`
          : formatOpsError(e, API_URL),
      )
      void balance.refetch()
    },
    onSettled: () => guard.finish(),
  })

  function submit() {
    if (checking || check.state !== "ok") return
    if (!guard.tryStart()) return
    setError(null)
    send.mutate()
  }

  const close = () => {
    setReceipt(null)
    setError(null)
    onClose()
  }
  const busy = send.isPending

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
    line: { flexDirection: "row" as const, justifyContent: "space-between" as const, gap: spacing.md, paddingVertical: 4 },
    label: { ...typography.bodySm, color: c.mutedForeground, flex: 1 },
    value: { ...typography.bodySm, color: c.text, fontVariant: ["tabular-nums"] as const },
    alert: { ...typography.bodySm, color: c.danger, marginVertical: spacing.sm },
    section: { ...typography.caption, color: c.mutedForeground, fontWeight: "700" as const, marginTop: spacing.md, marginBottom: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.sm },
  }))

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={busy ? undefined : close}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
          <ScrollView keyboardShouldPersistTaps="handled">
            {receipt ? (
              <>
                <Text style={styles.title}>{disburseReceiptTitle(receipt)}</Text>
                <Text style={styles.help}>
                  {receipt.sent.length === 0
                    ? "No money left the Paystack balance. The reason is under each driver below."
                    : `Payout run · ${receipt.at.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" })}`}
                </Text>
                {receipt.sent.map((r) => (
                  <View key={r.id} style={styles.line}>
                    <Text style={styles.label}>{r.name}</Text>
                    <Text style={styles.value}>{formatKes(r.amountKes)}</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.line}>
                  <Text style={styles.label}>Est. Paystack fees</Text>
                  <Text style={styles.value}>{formatKes(receipt.feesKes)}</Text>
                </View>
                <View style={styles.line}>
                  <Text style={styles.label}>Total sent</Text>
                  <Text style={styles.value}>{formatKes(receipt.totalKes)}</Text>
                </View>
                {receipt.skipped.length > 0 ? (
                  <>
                    <Text style={styles.section}>Not sent</Text>
                    {receipt.skipped.map((s) => (
                      <View key={s.name} style={styles.line}>
                        <Text style={styles.label}>{s.name}</Text>
                        <Text style={[styles.value, { flex: 2, textAlign: "right" }]}>{s.reason}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
                <PrimaryButton label="Done" onPress={close} />
              </>
            ) : (
              <>
                <Text style={styles.title}>Send driver payouts</Text>
                <Text style={styles.help}>Money leaves the Paystack balance as soon as you confirm.</Text>
                <View style={styles.line}>
                  <Text style={styles.label}>Drivers</Text>
                  <Text style={styles.value}>{batch.length}</Text>
                </View>
                <View style={styles.line}>
                  <Text style={styles.label}>Total</Text>
                  <Text style={styles.value}>{formatKes(totalKes)}</Text>
                </View>
                <View style={styles.line}>
                  <Text style={styles.label}>Estimated Paystack fees</Text>
                  <Text style={styles.value}>{formatKes(feesKes)}</Text>
                </View>
                <View style={styles.line}>
                  <Text style={styles.label}>Paystack balance</Text>
                  <Text style={styles.value}>
                    {checking ? "Checking…" : balance.data ? formatKes(balance.data.balanceKes) : "Unavailable"}
                  </Text>
                </View>

                {!checking && check.state === "short" ? (
                  <Text style={styles.alert} accessibilityRole="alert">
                    The Paystack balance doesn’t cover the total plus fees: it is short by {formatKes(check.shortByKes)}. Top up the
                    balance first.
                  </Text>
                ) : null}
                {!checking && check.state === "unavailable" ? (
                  <Text style={styles.alert} accessibilityRole="alert">
                    Couldn’t read the Paystack balance, so sending is paused. Go back and press Disburse again.
                  </Text>
                ) : null}
                {error ? (
                  <Text style={styles.alert} accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}

                <PrimaryButton
                  label={busy ? "Sending…" : `Send ${formatKes(totalKes)} to ${batch.length} driver${batch.length === 1 ? "" : "s"}`}
                  onPress={submit}
                  disabled={busy || checking || check.state !== "ok"}
                />
                <SecondaryButton label="Back" onPress={close} disabled={busy} />
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
