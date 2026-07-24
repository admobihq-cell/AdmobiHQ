import { useState } from "react"
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  EyeOff,
  Receipt,
  SwapHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
  type AppIcon,
} from "@/components/icons"
import { PageHero } from "@/components/ui/page-hero"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type Transaction = {
  id: string
  label: string
  meta: string
  amount: number
  kind: "credit" | "debit"
}

const TRANSACTIONS: Transaction[] = [
  { id: "1", label: "Nova Media — campaign top-up", meta: "2h ago", amount: 50000, kind: "credit" },
  { id: "2", label: "Driver payout batch #482", meta: "Yesterday", amount: 12400, kind: "debit" },
  { id: "3", label: "Skyline Ads — campaign top-up", meta: "Yesterday", amount: 25000, kind: "credit" },
  { id: "4", label: "Driver payout — J. Alvarez", meta: "2 days ago", amount: 1800, kind: "debit" },
  { id: "5", label: "Refund — cancelled campaign", meta: "3 days ago", amount: 6500, kind: "debit" },
]

const ACTIONS: Array<{ key: string; label: string; icon: AppIcon }> = [
  { key: "topup", label: "Top up", icon: ArrowUpCircle },
  { key: "payout", label: "Payout", icon: ArrowDownCircle },
  { key: "transfer", label: "Transfer", icon: SwapHorizontal },
]

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  })}`
}

export default function FinancesScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [hidden, setHidden] = useState(false)

  const balance = 1264800
  const moneyIn = 489000
  const moneyOut = 193400

  const notify = (message: string) => Alert.alert("Coming soon", message)

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.lg },
    walletCard: {
      borderRadius: 20,
      padding: spacing.lg,
      backgroundColor: c.primary,
      gap: spacing.md,
    },
    walletHeaderRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    walletLabelRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
    },
    walletLabel: {
      ...typography.label,
      color: "rgba(250, 249, 247, 0.85)",
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    balance: {
      fontSize: 34,
      fontWeight: "700" as const,
      color: c.primaryForeground,
      letterSpacing: -0.6,
    },
    walletHint: {
      ...typography.caption,
      color: "rgba(250, 249, 247, 0.75)",
    },
    actionsRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      marginTop: spacing.sm,
    },
    actionItem: { alignItems: "center" as const, gap: spacing.xs, flex: 1 },
    actionCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(250, 249, 247, 0.16)",
    },
    actionLabel: {
      ...typography.caption,
      color: c.primaryForeground,
      fontWeight: "600" as const,
    },
    statsRow: { flexDirection: "row" as const, gap: spacing.md },
    statCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: spacing.md,
      gap: spacing.xs,
    },
    statHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
    },
    statLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    statValue: { ...typography.headline, color: c.text },
    sectionHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    seeAll: { ...typography.caption, color: c.primary, fontWeight: "700" as const },
    group: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: "hidden" as const,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 60,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    txCopy: { flex: 1, gap: 2 },
    txLabel: { ...typography.section, color: c.text },
    txMeta: { ...typography.caption, color: c.mutedForeground },
    txAmountCredit: { ...typography.body, fontWeight: "700" as const, color: c.success },
    txAmountDebit: { ...typography.body, fontWeight: "700" as const, color: c.destructive },
    note: {
      ...typography.caption,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
  }))

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <PageHero
        eyebrow="Operations"
        title="Finances"
        description="Platform wallet, campaign top-ups, and driver payouts in one place."
        compact
      />

      <View style={styles.walletCard}>
        <View style={styles.walletHeaderRow}>
          <View style={styles.walletLabelRow}>
            <Wallet color={colors.primaryForeground} size={16} />
            <Text style={styles.walletLabel}>Platform wallet balance</Text>
          </View>
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8}>
            {hidden ? (
              <EyeOff color={colors.primaryForeground} size={20} />
            ) : (
              <Eye color={colors.primaryForeground} size={20} />
            )}
          </Pressable>
        </View>

        <Text style={styles.balance}>{hidden ? "••••••••" : formatCurrency(balance)}</Text>
        <Text style={styles.walletHint}>Held across 58 active campaign wallets</Text>

        <View style={styles.actionsRow}>
          {ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Pressable
                key={action.key}
                style={styles.actionItem}
                onPress={() =>
                  notify(`${action.label} will be available in a future update.`)
                }
              >
                <View style={styles.actionCircle}>
                  <Icon color={colors.primaryForeground} size={20} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <TrendingUp color={colors.success} size={16} />
            <Text style={styles.statLabel}>Money in · 30d</Text>
          </View>
          <Text style={styles.statValue}>{formatCurrency(moneyIn)}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <TrendingDown color={colors.destructive} size={16} />
            <Text style={styles.statLabel}>Money out · 30d</Text>
          </View>
          <Text style={styles.statValue}>{formatCurrency(moneyOut)}</Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Recent transactions</Text>
          <Pressable
            onPress={() =>
              notify("The full transaction history is coming in a future update.")
            }
          >
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <View style={styles.group}>
          {TRANSACTIONS.map((tx, index) => (
            <View key={tx.id}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor:
                        tx.kind === "credit" ? colors.secondary : colors.destructiveMuted,
                    },
                  ]}
                >
                  <Receipt
                    color={tx.kind === "credit" ? colors.primary : colors.destructive}
                    size={18}
                  />
                </View>
                <View style={styles.txCopy}>
                  <Text style={styles.txLabel}>{tx.label}</Text>
                  <Text style={styles.txMeta}>{tx.meta}</Text>
                </View>
                <Text style={tx.kind === "credit" ? styles.txAmountCredit : styles.txAmountDebit}>
                  {tx.kind === "credit" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </Text>
              </View>
              {index < TRANSACTIONS.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.note}>
        Placeholder data. Wallet balances, top-ups, and payouts will connect to live billing
        once the finance API ships.
      </Text>
    </ScrollView>
  )
}
