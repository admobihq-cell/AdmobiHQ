import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"

import { ChevronRight, Wallet } from "@/components/icons"
import { spacing, typography, useThemedStyles } from "@/lib/theme"
import { formatCurrency, WALLET_CARD_BG, WALLET_CARD_FG } from "@/lib/wallet"

const PREVIEW_BALANCE = 18400

export function WalletPreviewCard() {
  const router = useRouter()

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
    footerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginTop: spacing.xs,
    },
    detailsLink: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
    },
    detailsLinkText: {
      ...typography.caption,
      color: WALLET_CARD_FG,
      fontWeight: "700" as const,
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
      <Text style={styles.balance}>{formatCurrency(PREVIEW_BALANCE)}</Text>
      <View style={styles.footerRow}>
        <Text style={styles.hint}>3 active campaigns · auto-reload off</Text>
        <Pressable
          onPress={() => router.push("/settings/billing")}
          hitSlop={8}
          style={styles.detailsLink}
          accessibilityRole="button"
          accessibilityLabel="See full wallet details"
        >
          <Text style={styles.detailsLinkText}>See full details</Text>
          <ChevronRight color={WALLET_CARD_FG} size={14} />
        </Pressable>
      </View>
    </Pressable>
  )
}
