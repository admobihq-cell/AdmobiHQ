import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"

import { ChevronRight, Wallet } from "@/components/icons"
import { spacing, typography, useThemedStyles } from "@/lib/theme"
import { useCampaigns } from "@/lib/use-campaigns"
import {
  formatCurrency,
  PLACEHOLDER_WALLET_BALANCE,
  useWallet,
  WALLET_CARD_BG,
  WALLET_CARD_FG,
} from "@/lib/wallet"

export function WalletPreviewCard() {
  const router = useRouter()
  const wallet = useWallet()
  // Same query key the overview screen already uses, so this costs no extra
  // request — react-query serves both from one cache entry.
  const campaignsQuery = useCampaigns()

  const balance = wallet.data?.balance ?? PLACEHOLDER_WALLET_BALANCE
  const autoReloadOn = wallet.data?.autoReload.enabled ?? false
  const liveCount = (campaignsQuery.data ?? []).filter((c) => c.flight_phase === "live").length

  const styles = useThemedStyles(() => ({
    card: {
      borderRadius: 20,
      padding: spacing.lg,
      backgroundColor: WALLET_CARD_BG,
      gap: spacing.xs,
    },
    cardPressed: {
      opacity: 0.9,
    },
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    labelRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      color: "rgba(250, 249, 247, 0.85)",
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    balance: {
      fontSize: 30,
      fontWeight: "700" as const,
      color: WALLET_CARD_FG,
      letterSpacing: -0.6,
    },
    hint: {
      ...typography.caption,
      color: "rgba(250, 249, 247, 0.75)",
    },
  }))

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push("/settings/billing")}
      accessibilityRole="button"
      accessibilityLabel="Open wallet"
    >
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <Wallet color={WALLET_CARD_FG} size={16} />
          <Text style={styles.label}>Wallet balance</Text>
        </View>
        <ChevronRight color={WALLET_CARD_FG} size={18} />
      </View>
      <Text style={styles.balance}>{formatCurrency(balance)}</Text>
      <Text style={styles.hint}>
        {liveCount} campaign{liveCount === 1 ? "" : "s"} live · auto-reload{" "}
        {autoReloadOn ? "on" : "off"}
      </Text>
    </Pressable>
  )
}
