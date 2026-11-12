import { useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import {
  ChartCard,
  DonutChart,
  HeroMetric,
  KpiStrip,
  KpiStripSkeleton,
  ChartSkeleton,
  ListSkeleton,
} from "@workspace/mobile-charts"
import type { IntegrationDto } from "@workspace/ops-contracts"
import {
  CATEGORY_LABEL,
  RATES_AS_OF,
  STATUS_LABEL,
  USD_KES,
  formatKes,
  formatUsd,
  monthlyUsd,
} from "@workspace/ops-contracts/integration-costs"

import { ListRow } from "@/components/app/list-row"
import { Plus, Wallet } from "@/components/icons"
import { IntegrationSheet, integrationsKey } from "@/components/settings/integration-sheet"
import { EmptyState } from "@/components/ui"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useChartPalette } from "@/lib/chart-palette"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsAccess, useOpsAuthReady, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, useThemeColors, useThemedStyles } from "@/lib/theme"

/**
 * The integrations ledger: every tool and subscription the company pays for, with the monthly USD and
 * KES totals the ops console shows (computed by the API with the console's own function). Ops admin only.
 */
export default function IntegrationsScreen() {
  usePageHeader("Integrations", { showBack: true, backHref: "/(ops)/profile" })
  const palette = useChartPalette()
  const colors = useThemeColors()
  const client = useOpsClient()
  const authReady = useOpsAuthReady()
  const { role, loading } = useOpsAccess()
  const isAdmin = role === "admin"
  const [editing, setEditing] = useState<IntegrationDto | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const query = useQuery({
    queryKey: integrationsKey,
    queryFn: () => client.integrations.list(),
    enabled: authReady && isAdmin,
  })

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, backgroundColor: c.bg, alignItems: "center" as const, justifyContent: "center" as const },
    content: { padding: spacing.lg, gap: 12, paddingBottom: spacing.xl },
    add: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: c.primary,
    },
    addText: { color: c.primaryForeground, fontWeight: "600" as const, fontSize: 15 },
    list: { backgroundColor: c.surface, borderRadius: radius.lg, overflow: "hidden" as const },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 16 },
    note: { fontSize: 12, lineHeight: 17, color: c.mutedForeground },
  }))

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    )
  }
  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <EmptyState icon={Wallet} title="You don't have access to Integrations" description="Only ops admins can see what the company pays for." />
      </View>
    )
  }

  const open = (item: IntegrationDto | null) => {
    setEditing(item)
    setSheetOpen(true)
  }
  const data = query.data

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
      >
        <Pressable style={styles.add} onPress={() => open(null)} accessibilityRole="button" accessibilityLabel="Add integration">
          <Plus color={colors.primaryForeground} size={18} strokeWidth={2.5} />
          <Text style={styles.addText}>Add integration</Text>
        </Pressable>

        {query.isPending ? (
          <>
            <KpiStripSkeleton palette={palette} />
            <ChartSkeleton palette={palette} />
            <ListSkeleton palette={palette} />
          </>
        ) : query.isError ? (
          <ApiErrorBanner message={formatOpsError(query.error, API_URL)} onRetry={() => void query.refetch()} />
        ) : data ? (
          <>
            <HeroMetric label="Monthly cost" value={formatKes(data.totals.monthlyKes)} palette={palette} />
            <Text style={styles.note}>
              {`${formatUsd(data.totals.monthlyUsd)} a month at 1 USD = KES ${USD_KES} (as of ${RATES_AS_OF}).`}
              {data.totals.usageNames.length > 0 ? ` Usage-based tools count at their typical spend: ${data.totals.usageNames.join(", ")}.` : ""}
            </Text>
            <KpiStrip
              palette={palette}
              items={[
                { label: "Annual", value: formatUsd(data.totals.annualUsd), note: "Monthly × 12" },
                { label: "Active tools", value: String(data.totals.activeCount), note: "Status active" },
                { label: "Free tools", value: String(data.totals.freeCount), note: "On a free plan" },
              ]}
            />
            <ChartCard
              title="By category"
              description="Monthly cost in USD"
              isEmpty={data.totals.byCategory.length === 0}
              emptyMessage="Nothing to chart yet."
              palette={palette}
            >
              <DonutChart
                data={data.totals.byCategory.map((c) => ({ name: c.label, value: c.monthly }))}
                centerLabel="a month"
                centerValue={formatUsd(data.totals.monthlyUsd)}
                format={(v) => formatUsd(v)}
                palette={palette}
              />
            </ChartCard>

            {data.items.length === 0 ? (
              <EmptyState icon={Wallet} title="No integrations yet" description="Add the tools and subscriptions the company pays for." />
            ) : (
              <View style={styles.list}>
                {data.items.map((item, i) => (
                  <View key={item.id}>
                    {i > 0 ? <View style={styles.separator} /> : null}
                    <ListRow
                      title={item.name}
                      subtitle={[CATEGORY_LABEL[item.category] ?? item.category, item.plan].filter(Boolean).join(" · ")}
                      meta={item.billing_cycle === "free" ? "Free" : `${formatUsd(monthlyUsd(item), true)} a month`}
                      statusLabel={STATUS_LABEL[item.status] ?? item.status}
                      statusVariant={item.status === "active" ? "success" : item.status === "canceled" ? "muted" : "attention"}
                      onPress={() => open(item)}
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
      <IntegrationSheet visible={sheetOpen} integration={editing} onClose={() => setSheetOpen(false)} />
    </>
  )
}
