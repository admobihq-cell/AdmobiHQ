import { useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import { RefreshControl, StyleSheet, Text, View } from "react-native"
import { useIsFetching } from "@tanstack/react-query"
import { KpiStrip, LedgerList, ListSkeleton } from "@workspace/mobile-charts"
import {
  DELETED_ORG,
  LEDGER_FILTERS,
  LEDGER_KIND_LABEL,
  NO_LEDGER,
  formatKes,
  type DateRangeKey,
  type LedgerRowDto,
} from "@workspace/ops-contracts"

import { RecordTransactionSheet } from "@/components/finances/record-transaction-sheet"
import { PrimaryButton } from "@/components/ui"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { financeKeys, useFinanceLedger, useMarkPaymentsSeen, useRecordOptions, useRefreshFinance } from "@/lib/use-finance"

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })

/**
 * The ledger for the period, newest first. The list is the screen's only scroller (so paging and pull to
 * refresh work), and `header` carries the tabs and range toolbar above it. Opening the ledger is
 * "laying eyes on" new payments, so it stamps them seen once and clears the Finances badge.
 */
export function LedgerTab({ range, header }: { range: DateRangeKey; header: ReactElement }) {
  const palette = useChartPalette()
  const ledger = useFinanceLedger(range)
  const options = useRecordOptions()
  const refresh = useRefreshFinance()
  const fetching = useIsFetching({ queryKey: financeKeys.all }) > 0
  const markSeen = useMarkPaymentsSeen()
  const [filter, setFilter] = useState<string>("all")
  const [recordOpen, setRecordOpen] = useState(false)

  // Once per time the tab opens (mount-only on purpose), not on every refetch. The ref also holds off the dev double-invoke.
  const stamped = useRef(false)
  useEffect(() => {
    if (stamped.current) return
    stamped.current = true
    markSeen.mutate()
  }, [])

  const data = ledger.data
  const rows = useMemo(
    () => (data?.rows ?? []).filter((r) => filter === "all" || r.kind === filter),
    [data?.rows, filter],
  )
  const filters = useMemo(
    () =>
      LEDGER_FILTERS.map((f) => ({
        value: f.value,
        label: f.label,
        count: f.value === "all" ? data?.rows.length ?? 0 : (data?.rows ?? []).filter((r) => r.kind === f.value).length,
      })),
    [data?.rows],
  )

  const top = (
    <View style={styles.top}>
      {header}
      {ledger.isError ? (
        <ApiErrorBanner message={formatOpsError(ledger.error, API_URL)} onRetry={() => ledger.refetch()} />
      ) : null}
      {data ? (
        <>
          <KpiStrip
            palette={palette}
            items={[
              { label: "Top-ups", value: formatKes(data.totals.topUpsKes), note: "Money in" },
              { label: "Spend", value: formatKes(data.totals.spendKes), note: "Charged to campaigns" },
              { label: "Refunds", value: formatKes(data.totals.refundsKes), note: "Returned to wallets" },
              { label: "Net", value: formatKes(data.totals.netKes), note: "Change in funds held" },
            ]}
          />
          {data.totals.count > data.rows.length ? (
            <Text style={[styles.caption, { color: palette.muted }]}>
              Showing the latest {data.rows.length} of {data.totals.count}. Totals cover them all.
            </Text>
          ) : null}
        </>
      ) : ledger.isPending ? (
        <ListSkeleton palette={palette} rows={4} />
      ) : null}
      <PrimaryButton label="Record transaction" onPress={() => setRecordOpen(true)} disabled={!options.data} />
    </View>
  )

  return (
    <>
      <LedgerList
        rows={rows}
        keyOf={(r) => String(r.id)}
        renderRow={(r) => <LedgerRow row={r} />}
        filters={filters}
        filter={filter}
        onFilter={setFilter}
        emptyMessage={data && data.rows.length > 0 ? "Nothing matches this filter." : NO_LEDGER}
        palette={palette}
        header={top}
        refreshControl={<RefreshControl refreshing={fetching} onRefresh={() => void refresh()} />}
      />
      {options.data ? (
        <RecordTransactionSheet visible={recordOpen} onClose={() => setRecordOpen(false)} options={options.data} />
      ) : null}
    </>
  )
}

function LedgerRow({ row }: { row: LedgerRowDto }) {
  const palette = useChartPalette()
  const meta = [row.category, row.reference, row.provider].filter(Boolean).join(" · ")
  return (
    <View style={styles.row} accessibilityLabel={`${LEDGER_KIND_LABEL[row.kind]}, ${row.orgName}, ${formatKes(row.amountKes)}`}>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowKind, { color: palette.muted }]}>
          {day(row.occurredAt)} · {LEDGER_KIND_LABEL[row.kind] ?? row.kind}
        </Text>
        <Text style={[styles.rowOrg, { color: row.orgName === DELETED_ORG ? palette.muted : palette.text }]} numberOfLines={1}>
          {row.orgName}
          {row.campaignName ? ` · ${row.campaignName}` : ""}
        </Text>
        <Text style={[styles.rowDesc, { color: palette.text }]} numberOfLines={2}>
          {row.description}
        </Text>
        {meta ? <Text style={[styles.rowMeta, { color: palette.muted }]} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <Text style={[styles.rowAmount, { color: row.amountKes < 0 ? palette.bad : palette.text }]}>
        {row.amountKes > 0 ? "+" : ""}
        {formatKes(row.amountKes)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  top: { gap: 12, paddingBottom: 12 },
  caption: { fontSize: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  rowCopy: { flex: 1, gap: 2 },
  rowKind: { fontSize: 11 },
  rowOrg: { fontSize: 14, fontWeight: "600" },
  rowDesc: { fontSize: 13 },
  rowMeta: { fontSize: 11 },
  rowAmount: { fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
})
