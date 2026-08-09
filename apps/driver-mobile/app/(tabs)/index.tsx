import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Clock, PackageCheck, TrendingUp, Wallet } from "@/components/icons"
import { StatCard } from "@/components/ui/stat-card"
import { EARNINGS_STATS } from "@/lib/placeholder-data"
import { spacing, typography, useThemedStyles } from "@/lib/theme"

const STAT_ICONS = [Wallet, Clock, TrendingUp, PackageCheck] as const

export default function EarningsScreen() {
  const insets = useSafeAreaInsets()
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
        <Text style={styles.eyebrow}>This week</Text>
        <Text style={styles.title}>Your earnings</Text>
        <Text style={styles.subtitle}>
          Illustrative numbers — real earnings connect once proof-of-play telemetry
          from your screen goes live.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {EARNINGS_STATS.map((stat, index) => (
          <StatCard
            key={stat.label}
            icon={STAT_ICONS[index]!}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Payout history</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No payouts yet</Text>
          <Text style={styles.emptyBody}>
            Payout history will appear here once telemetry and payouts are live —
            in the meantime, ops settles earnings manually.
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}
