import { useState } from "react"
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useIsFetching } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { RangeToolbar, SegmentTabs } from "@workspace/mobile-charts"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { LedgerTab } from "@/components/finances/ledger-tab"
import { OverviewTab } from "@/components/finances/overview-tab"
import { PayoutsTab } from "@/components/finances/payouts-tab"
import { ToolCostsTab } from "@/components/finances/tool-costs-tab"
import { WalletsTab } from "@/components/finances/wallets-tab"
import { Wallet } from "@/components/icons"
import { EmptyState } from "@/components/ui"
import { useChartPalette } from "@/lib/chart-palette"
import { usePageHeader } from "@/lib/page-header"
import { spacing, useThemedStyles } from "@/lib/theme"
import { financeKeys, useFinanceAccess, useRefreshFinance, useUnseenPayments } from "@/lib/use-finance"

type FinanceTab = "overview" | "ledger" | "wallets" | "payouts" | "tool-costs"

/** Tabs that read a date range. Wallets and Tool costs are all-time or run-rate, so they take none. */
const RANGED: FinanceTab[] = ["overview", "ledger", "payouts"]

/**
 * Real money, from the wallet ledger, payouts and the integrations list, in five tabs like the ops
 * console. Without the `finances` permission nothing is requested: `useFinanceAccess` reads it from
 * the cached `me` query, so a missing permission never turns into a failed request.
 */
export default function FinancesScreen() {
  usePageHeader("Finances")
  const palette = useChartPalette()
  const { allowed, loading } = useFinanceAccess()
  const unseen = useUnseenPayments()
  const router = useRouter()
  const refresh = useRefreshFinance()
  const fetching = useIsFetching({ queryKey: financeKeys.all }) > 0
  const [tab, setTab] = useState<FinanceTab>("overview")
  const [range, setRange] = useState<DateRangeKey>("30d")

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, backgroundColor: c.bg, alignItems: "center" as const, justifyContent: "center" as const },
    content: { padding: spacing.lg, gap: 12, paddingBottom: spacing.xl },
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

  const header = (
    <View style={stack.header}>
      <SegmentTabs<FinanceTab>
        palette={palette}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "ledger", label: "Ledger", badge: unseen.data },
          { value: "wallets", label: "Wallets" },
          { value: "payouts", label: "Payouts" },
          { value: "tool-costs", label: "Tool costs" },
        ]}
      />
      {RANGED.includes(tab) ? <RangeToolbar palette={palette} value={range} onChange={setRange} /> : null}
    </View>
  )

  // The list tabs own the scroll (paging, pull to refresh), so they take the header as part of the list.
  if (tab === "ledger") {
    return (
      <View style={[styles.container, stack.listPad]}>
        <LedgerTab key="ledger" range={range} header={header} />
      </View>
    )
  }
  if (tab === "wallets") {
    return (
      <View style={[styles.container, stack.listPad]}>
        <WalletsTab header={header} />
      </View>
    )
  }
  if (tab === "payouts") {
    return (
      <View style={[styles.container, stack.listPad]}>
        <PayoutsTab range={range} header={header} onNewRun={() => router.push("/(ops)/finances/payout-run")} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={fetching} onRefresh={() => void refresh()} />}
    >
      {header}
      {tab === "overview" ? <OverviewTab range={range} onOpenPayouts={() => setTab("payouts")} /> : null}
      {tab === "tool-costs" ? <ToolCostsTab /> : null}
    </ScrollView>
  )
}

const stack = StyleSheet.create({
  header: { gap: 12 },
  listPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
})
