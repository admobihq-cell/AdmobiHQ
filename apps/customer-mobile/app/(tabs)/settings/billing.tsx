import { useCallback, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Stack, useFocusEffect } from "expo-router"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  Add,
  Download,
  Eye,
  EyeOff,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
  Warning,
} from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"
import { useCampaigns } from "@/lib/use-campaigns"
import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { payWithPaystack, startTopUp } from "@/lib/payments"
import { useOrgPermissions } from "@/lib/use-org"
import {
  formatCurrency,
  useRecentTransactions,
  useWallet,
  WALLET_QUERY_KEY,
  WALLET_CARD_BG,
  WALLET_CARD_FG,
} from "@/lib/wallet"

type Transaction = {
  id: string
  label: string
  meta: string
  amount: number
  kind: "credit" | "debit"
}

const TOPUP_PRESETS = [5000, 10000, 20000, 50000]

const TOP_UP_MIN = 100
const TOP_UP_MAX = 1_000_000
const RECENT_COUNT = 5

type Panel = "topup" | null

export default function BillingSettingsScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [hidden, setHidden] = useState(false)

  const [panel, setPanel] = useState<Panel>(null)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [showOlderTransactions, setShowOlderTransactions] = useState(false)

  const queryClient = useQueryClient()

  const getToken = useTokenGetter()
  const { can } = useOrgPermissions()
  const canRead = can("billing:read")
  const canWrite = can("billing:write")
  const walletQuery = useWallet({ enabled: canRead })
  const txQuery = useRecentTransactions({ enabled: canRead })
  const campaignsQuery = useCampaigns()
  const liveCampaignCount = (campaignsQuery.data ?? []).filter(
    (c) => c.flight_phase === "live",
  ).length
  const summary = walletQuery.data
  const balance = summary?.availableKes ?? 0
  const loading = walletQuery.isLoading

  // The refetch functions are stable; the query objects are not (a dep on them would loop).
  const refetchSummary = walletQuery.refetch
  const refetchTransactions = txQuery.refetch
  const refetchWallet = useCallback(() => {
    if (!canRead) return
    void refetchSummary()
    void refetchTransactions()
  }, [canRead, refetchSummary, refetchTransactions])
  useFocusEffect(refetchWallet)

  const isLow = summary?.funding.level === "short"

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.lg },
    hero: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    heroIconTile: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      backgroundColor: `${c.primary}14`,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    heroCopy: { flex: 1, minWidth: 0, gap: 2 },
    title: { ...typography.title, color: c.text, fontSize: 21 },
    subtitle: {
      ...typography.bodySm,
      color: c.mutedForeground,
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
    panel: {
      padding: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: spacing.md,
    },
    panelTitle: { ...typography.section, color: c.text },
    chipGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      ...typography.label,
      color: c.mutedForeground,
      fontWeight: "600" as const,
    },
    chipTextActive: {
      color: c.primaryForeground,
    },
    input: {
      ...typography.body,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: c.bg,
    },
    toggleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    toggleLabel: { ...typography.body, color: c.text, fontWeight: "600" as const },
    submit: {
      alignItems: "center" as const,
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 12,
    },
    submitDisabled: { opacity: 0.6 },
    submitText: {
      ...typography.body,
      fontWeight: "700" as const,
      color: c.primaryForeground,
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

  function openAction(key: "topup" | "statement") {
    if (key === "topup") setPanel(panel === "topup" ? null : "topup")
    else setShowOlderTransactions(true)
  }

  // Paystack hosted checkout in the in-app browser, then poll until it settles.
  const topUpMutation = useMutation({
    mutationFn: async (amount: number) => payWithPaystack(getToken, await startTopUp(getToken, amount)),
    onSuccess: (status) => {
      void queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY })
      if (status === "success") {
        setPanel(null)
        setTopUpAmount("")
        Alert.alert("Payment received", "The money is in your balance.")
      } else if (status === "pending") {
        Alert.alert("Still confirming", "We'll notify you as soon as your payment lands.")
      } else if (status === "amount_mismatch") {
        Alert.alert("We're checking your payment", "We'll update you within one working day.")
      } else {
        Alert.alert("Payment didn't go through", "Nothing was charged. You can try again.")
      }
    },
    onError: (error) => Alert.alert("Couldn't start the payment", error instanceof Error ? error.message : "Try again."),
  })
  const topUpValue = Number(topUpAmount.replace(/[^0-9]/g, ""))
  const topUpValid = Number.isInteger(topUpValue) && topUpValue >= TOP_UP_MIN && topUpValue <= TOP_UP_MAX
  function handleTopUp() {
    if (topUpValid && !topUpMutation.isPending) topUpMutation.mutate(topUpValue)
  }

  const allTransactions: Transaction[] = (txQuery.data?.items ?? []).map((t) => ({
    id: String(t.id),
    label: t.campaignName ? `${t.description} · ${t.campaignName}` : t.description,
    meta: new Date(t.occurredAt).toLocaleDateString("en-KE", { dateStyle: "medium" }),
    amount: Math.abs(t.amountKes),
    kind: t.amountKes >= 0 ? "credit" : "debit",
  }))
  const visibleTransactions = showOlderTransactions ? allTransactions : allTransactions.slice(0, RECENT_COUNT)
  const spendByCampaign = summary?.spendByCampaign ?? []

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
        refreshControl={
          <RefreshControl
            refreshing={walletQuery.isRefetching}
            onRefresh={refetchWallet}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroIconTile}>
            <Wallet color={colors.primary} size={20} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Wallet</Text>
            <Text style={styles.subtitle}>
              Fund your campaigns and track spend. Pay by M-Pesa or card through Paystack.
            </Text>
          </View>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletHeaderRow}>
            <View style={styles.walletLabelRow}>
              <Wallet color={WALLET_CARD_FG} size={16} />
              <Text style={styles.walletLabel}>Available balance</Text>
            </View>
            <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8}>
              {hidden ? (
                <EyeOff color={WALLET_CARD_FG} size={20} />
              ) : (
                <Eye color={WALLET_CARD_FG} size={20} />
              )}
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={WALLET_CARD_FG} />
          ) : (
            <Text style={styles.balance}>
              {!canRead ? "—" : hidden ? "••••••••" : formatCurrency(balance)}
            </Text>
          )}
          <Text style={styles.walletHint}>
            {canRead
              ? `${formatCurrency(summary?.committedKes ?? 0)} held for campaigns · ${liveCampaignCount} live`
              : "Ask your account owner for billing access."}
          </Text>

          <View style={styles.actionsRow}>
            {canWrite ? (
              <Pressable style={styles.actionItem} onPress={() => openAction("topup")}>
                <View style={styles.actionCircle}>
                  <Add color={WALLET_CARD_FG} size={20} />
                </View>
                <Text style={styles.actionLabel}>Top up</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.actionItem} onPress={() => openAction("statement")}>
              <View style={styles.actionCircle}>
                <Download color={WALLET_CARD_FG} size={20} />
              </View>
              <Text style={styles.actionLabel}>Statement</Text>
            </Pressable>
          </View>
        </View>

        {panel === "topup" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Top up</Text>
            <Text style={styles.note}>
              M-Pesa is limited per transaction by Safaricom; use a card for larger amounts.
            </Text>
            <View style={styles.chipGrid}>
              {TOPUP_PRESETS.map((amount) => (
                <Pressable
                  key={amount}
                  style={[styles.chip, topUpAmount === String(amount) && styles.chipActive]}
                  onPress={() => setTopUpAmount(String(amount))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      topUpAmount === String(amount) && styles.chipTextActive,
                    ]}
                  >
                    {formatCurrency(amount)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              placeholder="Amount (KES 100 – 1,000,000)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
            />
            <Pressable
              style={[styles.submit, (!topUpValid || topUpMutation.isPending) && { opacity: 0.5 }]}
              onPress={handleTopUp}
              disabled={!topUpValid || topUpMutation.isPending}
              accessibilityRole="button"
            >
              {topUpMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.submitText}>
                  {topUpValid ? `Pay ${formatCurrency(topUpValue)}` : "Pay"}
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {isLow ? (
          <View style={styles.lowBalanceBanner}>
            <Warning color={colors.destructive} size={18} />
            <Text style={styles.lowBalanceText}>
              Your funds are short — top up to keep your campaigns running without
              interruption.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>Spend by campaign · 30d</Text>
          <View style={styles.group}>
            {spendByCampaign.length === 0 ? (
              <Text style={styles.note}>No spend in the last 30 days.</Text>
            ) : null}
            {spendByCampaign.map((campaign, index) => (
              <View key={campaign.name}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                    <TrendingDown color={colors.primary} size={18} />
                  </View>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <Text style={styles.campaignSpend}>{formatCurrency(campaign.value)}</Text>
                </View>
                {index < spendByCampaign.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Recent transactions</Text>
            {!showOlderTransactions && allTransactions.length > RECENT_COUNT ? (
              <Pressable onPress={() => openAction("statement")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.group}>
            {canRead && !txQuery.isLoading && visibleTransactions.length === 0 ? (
              <Text style={styles.note}>Your transactions appear here after your first top-up.</Text>
            ) : null}
            {visibleTransactions.map((tx, index) => (
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
                {index < visibleTransactions.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.note}>
          Unused credit can be refunded to the original payment method from Finance & Billing on
          the web.
        </Text>
      </ScrollView>
    </>
  )
}
