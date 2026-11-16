import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useMutation } from "@tanstack/react-query"
import { StatusPill } from "@workspace/mobile-charts"
import {
  createInFlightGuard,
  formatKes,
  nairobiDay,
  payoutStatus,
  shiftMonth,
  type DisburseBatchItem,
} from "@workspace/ops-contracts"

import { DisburseSheet } from "@/components/finances/disburse-sheet"
import { Wallet } from "@/components/icons"
import { EmptyState, Field, PrimaryButton, SecondaryButton } from "@/components/ui"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { spacing, useThemedStyles } from "@/lib/theme"
import { useCanDisburse, useFinanceAccess, usePayoutRun, useRefreshFinance } from "@/lib/use-finance"

/** A saved payout can be edited until it has been sent; an unsaved driver has no payout yet. */
const editable = (status: string | undefined) => status === undefined || status === "pending"

const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-KE", { month: "long", year: "numeric", timeZone: "UTC" })

/**
 * A month's payout run. Ops types each approved driver's amount and saves the rows as pending (needs
 * `finances`); rows stay editable until sent. With the separate `payouts` permission, ops ticks pending
 * or failed rows and presses Disburse, which opens the confirm sheet.
 */
export default function PayoutRunScreen() {
  usePageHeader("Payout run", { showBack: true, backHref: "/(ops)/finances" })
  const palette = useChartPalette()
  const client = useOpsClient()
  const refresh = useRefreshFinance()
  const { allowed, loading } = useFinanceAccess()
  const canDisburse = useCanDisburse()
  const [month, setMonth] = useState(() => nairobiDay(new Date()).slice(0, 7))
  const run = usePayoutRun(month)
  const [amounts, setAmounts] = useState<Record<number, string>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const guard = useMemo(() => createInFlightGuard(), [])

  // Reload the editable amounts whenever a fresh run arrives (new month, or after a save or a send).
  useEffect(() => {
    if (!run.data) return
    setAmounts(Object.fromEntries(run.data.drivers.map((d) => [d.driverProfileId, d.payout ? String(d.payout.amountKes) : ""])))
    setSelected(new Set())
  }, [run.data])

  const save = useMutation({
    mutationFn: (items: { driverProfileId: number; amountKes: number }[]) => client.payouts.saveRun({ periodMonth: month, items }),
    onSuccess: async (result) => {
      await refresh()
      await run.refetch()
      Alert.alert(
        `Saved ${result.saved} pending payout${result.saved === 1 ? "" : "s"}`,
        result.skipped.length ? `${result.skipped.length} skipped: ${result.skipped[0]!.reason}` : undefined,
      )
    },
    onError: (e) => setError(formatOpsError(e, API_URL)),
    onSettled: () => guard.finish(),
  })

  const drivers = run.data?.drivers ?? []
  const chosen = drivers.filter((d) => d.payout && selected.has(d.payout.id))
  const batch: DisburseBatchItem[] = chosen.map((d) => ({
    id: d.payout!.id,
    name: d.name,
    amountKes: d.payout!.amountKes,
    feeKes: d.payout!.estimatedFeeKes,
  }))

  function onSave() {
    const items = drivers
      .filter((d) => editable(d.payout?.status) && Number(amounts[d.driverProfileId]) > 0)
      .map((d) => ({ driverProfileId: d.driverProfileId, amountKes: Number(amounts[d.driverProfileId]) }))
    if (items.length === 0) return setError("Enter at least one amount above zero.")
    if (!guard.tryStart()) return
    setError(null)
    save.mutate(items)
  }

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, backgroundColor: c.bg, alignItems: "center" as const, justifyContent: "center" as const },
    content: { padding: spacing.lg, gap: 12, paddingBottom: spacing.xl * 2 },
  }))

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    )
  }
  if (!allowed) {
    return (
      <View style={styles.centered}>
        <EmptyState icon={Wallet} title="You don't have access to Finances" description="Ask an admin to grant the Finances permission." />
      </View>
    )
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={run.isFetching} onRefresh={() => void run.refetch()} />}
      >
        <View style={local.monthRow}>
          <Pressable
            onPress={() => setMonth(shiftMonth(month, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={[local.step, { borderColor: palette.border }]}
          >
            <Text style={[local.stepText, { color: palette.text }]}>‹</Text>
          </Pressable>
          <Text style={[local.month, { color: palette.text }]} accessibilityRole="header">
            {monthName(month)}
          </Text>
          <Pressable
            onPress={() => setMonth(shiftMonth(month, 1))}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={[local.step, { borderColor: palette.border }]}
          >
            <Text style={[local.stepText, { color: palette.text }]}>›</Text>
          </Pressable>
        </View>

        <Text style={[local.help, { color: palette.muted }]}>
          Approved drivers with payout details. Type each amount and save; saved rows stay pending and editable until they are
          disbursed.
        </Text>

        {run.isError ? <ApiErrorBanner message={formatOpsError(run.error, API_URL)} onRetry={() => run.refetch()} /> : null}
        {run.isPending ? <ActivityIndicator /> : null}
        {run.data && drivers.length === 0 ? (
          <Text style={[local.help, { color: palette.muted }]}>No approved drivers have payout details yet.</Text>
        ) : null}

        {drivers.map((d) => {
          const p = d.payout
          const canSend = canDisburse && p && (p.status === "pending" || p.status === "failed")
          const status = p ? payoutStatus(p.status) : null
          const isSelected = p ? selected.has(p.id) : false
          return (
            <View key={d.driverProfileId} style={[local.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <View style={local.cardHead}>
                {canSend ? (
                  <Pressable
                    onPress={() =>
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (next.has(p.id)) next.delete(p.id)
                        else next.add(p.id)
                        return next
                      })
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`Select ${d.name}`}
                    hitSlop={8}
                    style={[local.box, { borderColor: isSelected ? palette.text : palette.border, backgroundColor: isSelected ? palette.text : "transparent" }]}
                  >
                    {isSelected ? <Text style={[local.tick, { color: palette.surface }]}>✓</Text> : null}
                  </Pressable>
                ) : null}
                <View style={local.cardCopy}>
                  <Text style={[local.name, { color: palette.text }]} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={[local.meta, { color: palette.muted }]}>
                    {d.method === "mpesa" ? "M-Pesa" : (d.bankName ?? "Bank")} {d.destinationMasked}
                  </Text>
                </View>
                {status ? <StatusPill label={status.label} tone={status.tone} palette={palette} /> : <Text style={[local.meta, { color: palette.muted }]}>Not saved</Text>}
              </View>
              {p?.failureReason && (p.status === "failed" || p.status === "reversed") ? (
                <Text style={[local.reason, { color: palette.bad }]}>{p.failureReason}</Text>
              ) : null}
              <Field
                value={amounts[d.driverProfileId] ?? ""}
                onChangeText={(text) => setAmounts((prev) => ({ ...prev, [d.driverProfileId]: text }))}
                placeholder="Amount (KES)"
                keyboardType="decimal-pad"
                editable={editable(p?.status) && !save.isPending}
                accessibilityLabel={`Amount in KES for ${d.name}`}
              />
            </View>
          )
        })}

        {error ? <Text style={[local.help, { color: palette.bad }]}>{error}</Text> : null}

        <PrimaryButton label={save.isPending ? "Saving…" : "Save as pending"} onPress={onSave} disabled={save.isPending || drivers.length === 0} />
        {canDisburse ? (
          <SecondaryButton
            label={chosen.length > 0 ? `Disburse ${chosen.length} (${formatKes(batch.reduce((s, b) => s + b.amountKes, 0))})` : "Disburse"}
            onPress={() => setDisburseOpen(true)}
            disabled={chosen.length === 0 || save.isPending}
          />
        ) : null}
      </ScrollView>

      <DisburseSheet
        visible={disburseOpen}
        batch={batch}
        onClose={() => {
          setDisburseOpen(false)
          void run.refetch()
        }}
      />
    </>
  )
}

const local = StyleSheet.create({
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  step: { width: 44, height: 44, borderWidth: 1, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 22, lineHeight: 26 },
  month: { fontSize: 17, fontWeight: "600" },
  help: { fontSize: 13, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardCopy: { flex: 1, gap: 1 },
  name: { fontSize: 14, fontWeight: "600" },
  meta: { fontSize: 12 },
  reason: { fontSize: 12 },
  box: { width: 24, height: 24, borderWidth: 1.5, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  tick: { fontSize: 15, fontWeight: "700" },
})
