import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  Add,
  Download,
  Eye,
  EyeOff,
  Receipt,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
  Warning,
  type AppIcon,
} from "@/components/icons"
import { ComingSoonModal } from "@/components/ui/coming-soon-modal"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"
import { formatCurrency, WALLET_CARD_BG, WALLET_CARD_FG } from "@/lib/wallet"

type Transaction = {
  id: string
  label: string
  meta: string
  amount: number
  kind: "credit" | "debit"
}

const TRANSACTIONS: Transaction[] = [
  { id: "1", label: "Wallet top-up · M-Pesa", meta: "Today, 9:14 AM", amount: 50000, kind: "credit" },
  { id: "2", label: "Nairobi CBD Summer — daily spend", meta: "Today", amount: 6200, kind: "debit" },
  { id: "3", label: "Westlands Retail Push — daily spend", meta: "Yesterday", amount: 4800, kind: "debit" },
  { id: "4", label: "Wallet top-up · Visa •• 4821", meta: "3 days ago", amount: 30000, kind: "credit" },
  { id: "5", label: "Karen Estate Awareness — daily spend", meta: "4 days ago", amount: 3100, kind: "debit" },
]

const SPEND_BY_CAMPAIGN = [
  { id: "1", name: "Nairobi CBD Summer", spend: 62400 },
  { id: "2", name: "Westlands Retail Push", spend: 41200 },
  { id: "3", name: "Karen Estate Awareness", spend: 12300 },
]

const ACTIONS: Array<{ key: string; label: string; icon: AppIcon; body: string }> = [
  {
    key: "topup",
    label: "Top up",
    icon: Add,
    body: "Add funds via M-Pesa or card. Wallet top-ups are coming in a future update.",
  },
  {
    key: "auto",
    label: "Auto reload",
    icon: RefreshCcw,
    body: "Automatically top up your wallet when the balance runs low. Coming soon.",
  },
  {
    key: "statement",
    label: "Statement",
    icon: Download,
    body: "Download a PDF statement of your wallet activity. Coming soon.",
  },
]

const LOW_BALANCE_THRESHOLD = 20000

export default function BillingSettingsScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [hidden, setHidden] = useState(false)
  const [comingSoon, setComingSoon] = useState<{ title: string; body: string } | null>(null)

  const balance = 18400
  const isLow = balance < LOW_BALANCE_THRESHOLD

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.lg },
    hero: { gap: spacing.xs },
    eyebrow: {
      ...typography.caption,
      color: c.primary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    title: { ...typography.title, color: c.text, fontSize: 26 },
    subtitle: {
      ...typography.body,
      color: c.mutedForeground,
      marginTop: spacing.xs,
    },
    walletCard: {
      borderRadius: 20,
      padding: spacing.lg,
      backgroundColor: WALLET_CARD_BG,
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
      color: WALLET_CARD_FG,
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
      color: WALLET_CARD_FG,
      fontWeight: "600" as const,
    },
    lowBalanceBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 14,
      backgroundColor: c.destructiveMuted,
    },
    lowBalanceText: {
      ...typography.caption,
      color: c.destructive,
      flex: 1,
      lineHeight: 18,
    },
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
    campaignName: { ...typography.section, color: c.text, flex: 1 },
    campaignSpend: { ...typography.section, color: c.mutedForeground },
    note: {
      ...typography.caption,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
  }))

  return (
    <>
      <Stack.Screen options={{ title: "Wallet" }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Workspace</Text>
          <Text style={styles.title}>Wallet</Text>
          <Text style={styles.subtitle}>
            Fund your campaigns and track spend. Placeholder data for layout
            preview.
          </Text>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletHeaderRow}>
            <View style={styles.walletLabelRow}>
              <Wallet color={WALLET_CARD_FG} size={16} />
              <Text style={styles.walletLabel}>Campaign wallet balance</Text>
            </View>
            <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8}>
              {hidden ? (
                <EyeOff color={WALLET_CARD_FG} size={20} />
              ) : (
                <Eye color={WALLET_CARD_FG} size={20} />
              )}
            </Pressable>
          </View>

          <Text style={styles.balance}>{hidden ? "••••••••" : formatCurrency(balance)}</Text>
          <Text style={styles.walletHint}>Auto-reload is off · 3 active campaigns</Text>

          <View style={styles.actionsRow}>
            {ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <Pressable
                  key={action.key}
                  style={styles.actionItem}
                  onPress={() => setComingSoon({ title: action.label, body: action.body })}
                >
                  <View style={styles.actionCircle}>
                    <Icon color={WALLET_CARD_FG} size={20} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {isLow ? (
          <View style={styles.lowBalanceBanner}>
            <Warning color={colors.destructive} size={18} />
            <Text style={styles.lowBalanceText}>
              Low balance — top up to keep your campaigns running without
              interruption.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>Spend by campaign · 30d</Text>
          <View style={styles.group}>
            {SPEND_BY_CAMPAIGN.map((campaign, index) => (
              <View key={campaign.id}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                    <TrendingDown color={colors.primary} size={18} />
                  </View>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <Text style={styles.campaignSpend}>{formatCurrency(campaign.spend)}</Text>
                </View>
                {index < SPEND_BY_CAMPAIGN.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Recent transactions</Text>
            <Pressable
              onPress={() =>
                setComingSoon({
                  title: "Transaction history",
                  body: "The full transaction history is coming in a future update.",
                })
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
                    {tx.kind === "credit" ? (
                      <TrendingUp color={colors.primary} size={18} />
                    ) : (
                      <Receipt color={colors.destructive} size={18} />
                    )}
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
          Placeholder data. Top-ups, auto-reload, and statements will connect to
          live billing once payments ship.
        </Text>
      </ScrollView>

      <ComingSoonModal
        visible={comingSoon !== null}
        title={comingSoon?.title ?? ""}
        body={comingSoon?.body ?? ""}
        onClose={() => setComingSoon(null)}
      />
    </>
  )
}
