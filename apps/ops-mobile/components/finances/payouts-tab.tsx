import { useMemo, useState, type ReactElement } from "react"
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native"
import { useIsFetching, useMutation } from "@tanstack/react-query"
import { KpiStrip, LedgerList, ListSkeleton, StackedBars, StatusPill, ChartCard } from "@workspace/mobile-charts"
import {
  createInFlightGuard,
  formatCompact,
  formatKes,
  monthLabel,
  payoutStatus,
  type DateRangeKey,
  type PayoutRowDto,
} from "@workspace/ops-contracts"

import { PrimaryButton } from "@/components/ui"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { financeKeys, useCanDisburse, useFinancePayouts, useRefreshFinance } from "@/lib/use-finance"

const NO_PAYOUTS = "Driver payouts appear here once they are recorded."

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Sending" },
  { value: "settled", label: "Settled" },
  { value: "failed", label: "Failed" },
  { value: "reversed", label: "Reversed" },
]

/** Driver payouts: how much has settled, what is stuck, and who is owed. The list is the screen's scroller. */
export function PayoutsTab({
  range,
  header,
  onNewRun,
}: {
  range: DateRangeKey
  header: ReactElement
  onNewRun: () => void
}) {
  const palette = useChartPalette()
  const payouts = useFinancePayouts(range)
  const refresh = useRefreshFinance()
  const fetching = useIsFetching({ queryKey: financeKeys.all }) > 0
  const canDisburse = useCanDisburse()
  const [filter, setFilter] = useState("all")

  const data = payouts.data
  const amount = (status: string) => data?.byStatus.find((s) => s.status === status)?.amountKes ?? 0
  const count = (status: string) => data?.byStatus.find((s) => s.status === status)?.count ?? 0
  const rows = useMemo(() => (data?.rows ?? []).filter((p) => filter === "all" || p.status === filter), [data?.rows, filter])
  const filters = FILTERS.map((f) => ({
    value: f.value,
    label: f.label,
    count: f.value === "all" ? data?.rows.length ?? 0 : count(f.value),
  }))
  const months = (data?.byMonth ?? []).map((m) => ({
    label: monthLabel(m.period),
    segments: [
      { key: "settled", value: m.settledKes },
      { key: "pending", value: m.pendingKes },
      { key: "failed", value: m.failedKes },
    ],
  }))

  const top = (
    <View style={styles.top}>
      {header}
      {payouts.isError ? <ApiErrorBanner message={formatOpsError(payouts.error, API_URL)} onRetry={() => payouts.refetch()} /> : null}
      <PrimaryButton label="New payout run" onPress={onNewRun} />
      {data ? (
        <>
          <KpiStrip
            palette={palette}
            columns={3}
            items={[
              { label: "Settled", value: formatKes(amount("settled")), note: `${count("settled")} paid` },
              { label: "Pending", value: formatKes(amount("pending")), note: `${count("pending")} waiting` },
              { label: "Failed", value: formatKes(amount("failed")), note: `${count("failed")} to retry` },
            ]}
          />
          <ChartCard
            title="Payouts by month"
            description="Value by status for the months in the period"
            isEmpty={months.length === 0}
            emptyMessage={NO_PAYOUTS}
            palette={palette}
          >
            <StackedBars
              bars={months}
              keys={[
                { key: "settled", label: "Settled" },
                { key: "pending", label: "Pending" },
                { key: "failed", label: "Failed" },
              ]}
              format={formatCompact}
              palette={palette}
            />
          </ChartCard>
        </>
      ) : payouts.isPending ? (
        <ListSkeleton palette={palette} rows={3} />
      ) : null}
    </View>
  )

  return (
    <LedgerList
      rows={rows}
      keyOf={(p) => String(p.id)}
      renderRow={(p) => <PayoutRow row={p} canRetry={canDisburse} />}
      filters={filters}
      filter={filter}
      onFilter={setFilter}
      emptyMessage={data && data.rows.length > 0 ? "Nothing matches this filter." : NO_PAYOUTS}
      palette={palette}
      header={top}
      refreshControl={<RefreshControl refreshing={fetching} onRefresh={() => void refresh()} />}
    />
  )
}

function PayoutRow({ row, canRetry }: { row: PayoutRowDto; canRetry: boolean }) {
  const palette = useChartPalette()
  const status = payoutStatus(row.status)
  const paysTo = row.method ? `${row.method === "mpesa" ? "M-Pesa" : "Bank"} ${row.destinationMasked ?? ""}`.trim() : "Manual"
  const paidOn = row.paidAt
    ? new Date(row.paidAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })
    : "Not paid"
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={[styles.driver, { color: palette.text }]} numberOfLines={1}>
          {row.driverName}
        </Text>
        <Text style={[styles.amount, { color: palette.text }]}>{formatKes(row.amountKes)}</Text>
      </View>
      <Text style={[styles.meta, { color: palette.muted }]}>
        {monthLabel(row.periodMonth)} · {paysTo} · {paidOn}
        {row.mpesaRef ? ` · ${row.mpesaRef}` : ""}
      </Text>
      <View style={styles.statusLine}>
        <StatusPill label={status.label} tone={status.tone} palette={palette} />
        {canRetry && row.status === "failed" && row.provider === "paystack" ? <RetryButton id={row.id} /> : null}
      </View>
      {row.failureReason && (row.status === "failed" || row.status === "reversed") ? (
        <Text style={[styles.reason, { color: palette.bad }]}>{row.failureReason}</Text>
      ) : null}
    </View>
  )
}

/** Resends a failed payout under the same reference, so Paystack can't pay it twice. One tap at a time. */
function RetryButton({ id }: { id: number }) {
  const palette = useChartPalette()
  const client = useOpsClient()
  const refresh = useRefreshFinance()
  const guard = useMemo(() => createInFlightGuard(), [])
  const retry = useMutation({
    mutationFn: () => client.payouts.retry(id),
    onSuccess: async () => {
      await refresh()
      Alert.alert("Payout resent to Paystack")
    },
    onError: (e) => Alert.alert("Could not retry the payout", formatOpsError(e, API_URL)),
    onSettled: () => guard.finish(),
  })
  return (
    <Pressable
      onPress={() => {
        if (!guard.tryStart()) return
        retry.mutate()
      }}
      disabled={retry.isPending}
      accessibilityRole="button"
      accessibilityLabel="Retry this payout"
      style={[styles.retry, { borderColor: palette.border }]}
    >
      <Text style={[styles.retryText, { color: palette.text }]}>{retry.isPending ? "Retrying…" : "Retry"}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  top: { gap: 12, paddingBottom: 12 },
  row: { paddingVertical: 12, gap: 4 },
  rowHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  driver: { flex: 1, fontSize: 14, fontWeight: "600" },
  amount: { fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  meta: { fontSize: 12 },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  reason: { fontSize: 12 },
  retry: { minHeight: 32, justifyContent: "center", borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 },
  retryText: { fontSize: 12, fontWeight: "600" },
})
