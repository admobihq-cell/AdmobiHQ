import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { PayoutStats } from "@/components/payout-stats"
import { withProfileGate } from "@/components/profile-setup/with-profile-gate"
import { formatKes, formatPayoutDate, monthName, PAYOUT_STATUS_LABEL, useDriverPayouts } from "@/lib/driver-payouts"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

/**
 * Real payouts only. Screen-on hours, distance and per-day earnings are not
 * shown: nothing records them yet, and an invented number is worse than none.
 */
function EarningsScreen() {
  const insets = useSafeAreaInsets()
  const payouts = useDriverPayouts()
  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
    eyebrow: {
      ...typography.caption,
      color: c.primary,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
    },
    title: { ...typography.largeTitle, fontSize: 26, color: c.text },
    subtitle: { ...typography.body, color: c.mutedForeground },
    statsGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    section: { gap: spacing.sm },
    sectionLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      fontWeight: "700" as const,
    },
    emptyCard: {
      padding: spacing.lg,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
      backgroundColor: c.muted,
      gap: 4,
    },
    emptyTitle: { ...typography.section, color: c.text },
    emptyBody: { ...typography.caption, color: c.mutedForeground },
    historyCard: { borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.card },
    historyRow: { flexDirection: "row" as const, alignItems: "center" as const, padding: spacing.md, gap: spacing.sm },
    historyDivider: { height: 1, backgroundColor: c.border },
    historyCopy: { flex: 1, gap: 2 },
    historyMonth: { ...typography.section, color: c.text },
    historyMeta: { ...typography.caption, color: c.mutedForeground },
    historyAmount: { ...typography.section, color: c.text },
  }))

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.eyebrow}>Payouts</Text>
        <Text style={styles.title}>Your earnings</Text>
        <Text style={styles.subtitle}>
          What Admobi has paid you and what&apos;s on its way, sent to the M-Pesa number or
          bank account in your profile.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <PayoutStats />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Payout history</Text>
        {payouts.data && payouts.data.items.length > 0 ? (
          <View style={styles.historyCard}>
            {payouts.data.items.map((p, index) => (
              <View key={p.id}>
                {index > 0 ? <View style={styles.historyDivider} /> : null}
                <View style={styles.historyRow}>
                  <View style={styles.historyCopy}>
                    <Text style={styles.historyMonth}>{monthName(p.periodMonth)}</Text>
                    <Text style={styles.historyMeta}>
                      {PAYOUT_STATUS_LABEL[p.status] ?? p.status}
                      {p.paidAt ? ` · ${formatPayoutDate(p.paidAt)}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>{formatKes(p.amountKes)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {payouts.isError ? "Couldn't load your payouts" : payouts.data ? "No payouts yet" : "Loading…"}
            </Text>
            <Text style={styles.emptyBody}>
              {payouts.isError ? "Pull down to try again later." : "Payouts appear here once ops sends one."}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default withProfileGate(EarningsScreen)
