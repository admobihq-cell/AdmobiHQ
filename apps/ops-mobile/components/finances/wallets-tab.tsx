import { useMemo, useState, type ReactElement } from "react"
import { RefreshControl, StyleSheet, Text, View } from "react-native"
import { useIsFetching } from "@tanstack/react-query"
import { KpiStrip, LedgerList, ListSkeleton, StatusPill } from "@workspace/mobile-charts"
import { WALLET_FILTERS, WALLET_STATUS_VIEW, formatKes, type WalletRowDto } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL } from "@/lib/ops-client"
import { financeKeys, useFinanceWallets, useRefreshFinance } from "@/lib/use-finance"

/** One row per advertiser with a wallet, grouped by whether they can cover what they have booked. */
export function WalletsTab({ header }: { header: ReactElement }) {
  const palette = useChartPalette()
  const wallets = useFinanceWallets()
  const refresh = useRefreshFinance()
  const fetching = useIsFetching({ queryKey: financeKeys.all }) > 0
  const [filter, setFilter] = useState<string>("all")

  const all = wallets.data
  const count = (status: string) => (all ?? []).filter((w) => w.status === status).length
  // Trouble first: the least available funds lead.
  const rows = useMemo(
    () => (all ?? []).filter((w) => filter === "all" || w.status === filter).sort((a, b) => a.availableKes - b.availableKes),
    [all, filter],
  )
  const filters = WALLET_FILTERS.map((f) => ({
    value: f.value,
    label: f.label,
    count: f.value === "all" ? all?.length ?? 0 : count(f.value),
  }))

  const top = (
    <View style={styles.top}>
      {header}
      {wallets.isError ? <ApiErrorBanner message={formatOpsError(wallets.error, API_URL)} onRetry={() => wallets.refetch()} /> : null}
      {all ? (
        <KpiStrip
          palette={palette}
          items={[
            { label: "Wallets", value: String(all.length), note: "Accounts with ledger activity" },
            { label: "Funds held", value: formatKes(all.reduce((sum, w) => sum + w.balanceKes, 0)), note: "Owed to advertisers" },
            { label: "Short of funds", value: String(count("short")), note: "Budgets exceed balance" },
            { label: "Inactive", value: String(count("inactive")), note: "No activity in 60 days" },
          ]}
        />
      ) : wallets.isPending ? (
        <ListSkeleton palette={palette} rows={4} />
      ) : null}
    </View>
  )

  return (
    <LedgerList
      rows={rows}
      keyOf={(w) => String(w.orgId)}
      renderRow={(w) => <WalletRow wallet={w} />}
      filters={filters}
      filter={filter}
      onFilter={setFilter}
      emptyMessage={all && all.length > 0 ? "Nothing matches this filter." : "Wallets appear here once an advertiser has ledger activity."}
      palette={palette}
      header={top}
      refreshControl={<RefreshControl refreshing={fetching} onRefresh={() => void refresh()} />}
    />
  )
}

function WalletRow({ wallet }: { wallet: WalletRowDto }) {
  const palette = useChartPalette()
  const status = WALLET_STATUS_VIEW[wallet.status]
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={[styles.org, { color: palette.text }]} numberOfLines={1}>
          {wallet.orgName}
        </Text>
        <StatusPill label={status.label} tone={status.tone} palette={palette} />
      </View>
      <View style={styles.figures}>
        <Figure label="Balance" value={formatKes(wallet.balanceKes)} />
        <Figure label="Committed" value={formatKes(wallet.committedKes)} />
        <Figure label="Available" value={formatKes(wallet.availableKes)} bad={wallet.availableKes < 0} />
      </View>
      <Text style={[styles.meta, { color: palette.muted }]}>
        Runway {wallet.runwayDays === null ? "–" : `${wallet.runwayDays} days`} · Last top-up {wallet.lastTopUpOn ?? "none"}
      </Text>
    </View>
  )
}

function Figure({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  const palette = useChartPalette()
  return (
    <View style={styles.figure}>
      <Text style={[styles.figureLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.figureValue, { color: bad ? palette.bad : palette.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  top: { gap: 12, paddingBottom: 12 },
  row: { paddingVertical: 12, gap: 6 },
  rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  org: { flex: 1, fontSize: 14, fontWeight: "600" },
  figures: { flexDirection: "row", gap: 8 },
  figure: { flex: 1, gap: 1 },
  figureLabel: { fontSize: 11 },
  figureValue: { fontSize: 13, fontVariant: ["tabular-nums"] },
  meta: { fontSize: 12 },
})
