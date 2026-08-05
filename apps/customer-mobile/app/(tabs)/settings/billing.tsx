import { useCallback, useState } from "react"
import { Stack, useFocusEffect } from "expo-router"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
  Warning,
} from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"
import {
  formatCurrency,
  getAutoReloadSettings,
  getWalletBalance,
  PLACEHOLDER_ACTIVE_CAMPAIGN_COUNT,
  PLACEHOLDER_WALLET_BALANCE,
  setAutoReloadSettings,
  topUpWallet,
  WALLET_CARD_BG,
  WALLET_CARD_FG,
  type AutoReloadSettings,
} from "@/lib/wallet"

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

const OLDER_TRANSACTIONS: Transaction[] = [
  { id: "6", label: "Mombasa Rd Commute — daily spend", meta: "6 days ago", amount: 2100, kind: "debit" },
  { id: "7", label: "Wallet top-up · M-Pesa", meta: "9 days ago", amount: 25000, kind: "credit" },
  { id: "8", label: "Nairobi CBD Summer — daily spend", meta: "10 days ago", amount: 5900, kind: "debit" },
]

const SPEND_BY_CAMPAIGN = [
  { id: "1", name: "Nairobi CBD Summer", spend: 62400 },
  { id: "2", name: "Westlands Retail Push", spend: 41200 },
  { id: "3", name: "Karen Estate Awareness", spend: 12300 },
]

const TOPUP_PRESETS = [5000, 10000, 20000, 50000]

const LOW_BALANCE_THRESHOLD = 20000

type Panel = "topup" | "autoreload" | null

export default function BillingSettingsScreen() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [hidden, setHidden] = useState(false)

  const [balance, setBalance] = useState(PLACEHOLDER_WALLET_BALANCE)
  const [autoReload, setAutoReload] = useState<AutoReloadSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState<Panel>(null)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [thresholdInput, setThresholdInput] = useState("")
  const [showOlderTransactions, setShowOlderTransactions] = useState(false)

  useFocusEffect(
    useCallback(() => {
      let mounted = true
      setLoading(true)
      void Promise.all([getWalletBalance(), getAutoReloadSettings()]).then(([bal, reload]) => {
        if (!mounted) return
        setBalance(bal)
        setAutoReload(reload)
        setThresholdInput(String(reload.threshold))
        setLoading(false)
      })
      return () => {
        mounted = false
      }
    }, []),
  )

  const isLow = balance < LOW_BALANCE_THRESHOLD

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

  function openAction(key: "topup" | "auto" | "statement") {
    if (key === "topup") setPanel(panel === "topup" ? null : "topup")
    else if (key === "auto") setPanel(panel === "autoreload" ? null : "autoreload")
    else setShowOlderTransactions(true)
  }

  async function handleTopUp(amount: number) {
    if (!amount || amount <= 0) return
    const next = await topUpWallet(amount)
    setBalance(next)
    setPanel(null)
    setTopUpAmount("")
  }

  async function handleSaveAutoReload(enabled: boolean) {
    const threshold = Number(thresholdInput.replace(/[^0-9]/g, "")) || 20000
    const next: AutoReloadSettings = { enabled, threshold, topUpAmount: 30000 }
    await setAutoReloadSettings(next)
    setAutoReload(next)
  }

  const visibleTransactions = showOlderTransactions
    ? [...TRANSACTIONS, ...OLDER_TRANSACTIONS]
    : TRANSACTIONS

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
          <View style={styles.heroIconTile}>
            <Wallet color={colors.primary} size={20} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Wallet</Text>
            <Text style={styles.subtitle}>
              Fund your campaigns and track spend. Top-ups here are saved on this device.
            </Text>
          </View>
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

          {loading ? (
            <ActivityIndicator color={WALLET_CARD_FG} />
          ) : (
            <Text style={styles.balance}>{hidden ? "••••••••" : formatCurrency(balance)}</Text>
          )}
          <Text style={styles.walletHint}>
            Auto-reload is {autoReload?.enabled ? "on" : "off"} · {PLACEHOLDER_ACTIVE_CAMPAIGN_COUNT}{" "}
            active campaigns
          </Text>

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionItem} onPress={() => openAction("topup")}>
              <View style={styles.actionCircle}>
                <Add color={WALLET_CARD_FG} size={20} />
              </View>
              <Text style={styles.actionLabel}>Top up</Text>
            </Pressable>
            <Pressable style={styles.actionItem} onPress={() => openAction("auto")}>
              <View style={styles.actionCircle}>
                <RefreshCcw color={WALLET_CARD_FG} size={20} />
              </View>
              <Text style={styles.actionLabel}>Auto reload</Text>
            </Pressable>
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
            <Text style={styles.panelTitle}>Top up wallet</Text>
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
              placeholder="Custom amount (KES)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
            />
            <Pressable
              style={styles.submit}
              onPress={() => void handleTopUp(Number(topUpAmount.replace(/[^0-9]/g, "")))}
            >
              <Text style={styles.submitText}>Add funds</Text>
            </Pressable>
          </View>
        ) : null}

        {panel === "autoreload" && autoReload ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Auto reload</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Reload automatically</Text>
              <Switch
                value={autoReload.enabled}
                onValueChange={(value) => void handleSaveAutoReload(value)}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <TextInput
              style={styles.input}
              value={thresholdInput}
              onChangeText={setThresholdInput}
              placeholder="Reload when balance drops below (KES)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              onBlur={() => void handleSaveAutoReload(autoReload.enabled)}
            />
          </View>
        ) : null}

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
            {!showOlderTransactions ? (
              <Pressable onPress={() => openAction("statement")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.group}>
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
          Placeholder data. Top-ups and auto-reload are saved on this device only — nothing here
          moves real money.
        </Text>
      </ScrollView>
    </>
  )
}
