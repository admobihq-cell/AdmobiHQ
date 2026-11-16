import { useCallback, useState } from "react"
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { groupPayoutsByYear } from "@workspace/ops-contracts"

import { SkeletonBlock } from "@/components/app/skeleton"
import { Pill, SectionHeader, type PillTone } from "@/components/app/section"
import { PayoutKpis, PayoutMonthsChart } from "@/components/payout-summary"
import { withProfileGate } from "@/components/profile-setup/with-profile-gate"
import { formatKes, formatPayoutDate, monthName, PAYOUT_STATUS_LABEL, useDriverPayouts } from "@/lib/driver-payouts"
import { radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from "@/lib/theme"

/** The node on the route and the pill beside it say the same thing: where this payout is. */
function toneFor(status: string, c: ThemeColors): { fill: string; ring: string; pill: PillTone } {
  if (status === "settled") return { fill: c.primary, ring: c.primary, pill: "good" }
  if (status === "failed" || status === "reversed") return { fill: c.destructive, ring: c.destructive, pill: "serious" }
  if (status === "pending" || status === "processing") return { fill: c.bg, ring: c.primary, pill: "warning" }
  return { fill: c.bg, ring: c.border, pill: "neutral" }
}

/**
 * Real payouts only. Screen-on hours, distance and per-day earnings are not
 * shown: nothing records them yet, and an invented number is worse than none.
 *
 * The latest payout leads (the driver's one question), then the history by year, each year headed by
 * what actually reached them that year.
 */
function EarningsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const payouts = useDriverPayouts()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await payouts.refetch()
    setRefreshing(false)
  }, [payouts])

  const styles = useThemedStyles((c) => ({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.xl },
    title: { ...typography.title, fontSize: 26, color: c.text },
    subtitle: { ...typography.body, color: c.mutedForeground },
    note: {
      padding: spacing.lg,
      borderRadius: radius["2xl"],
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
      gap: spacing.sm,
    },
    noteText: { ...typography.bodySm, color: c.mutedForeground },
    retry: {
      alignSelf: "flex-start" as const,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: "center" as const,
    },
    retryText: { ...typography.section, color: c.text },
    yearRow: { flexDirection: "row" as const, alignItems: "baseline" as const, justifyContent: "space-between" as const, marginBottom: spacing.md },
    year: { ...typography.headline, color: c.text },
    yearPaid: { ...typography.bodySm, color: c.mutedForeground, fontVariant: ["tabular-nums" as const] },
    row: { flexDirection: "row" as const, gap: spacing.md },
    rail: { width: 20, alignItems: "center" as const },
    node: { marginTop: 4, width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 1 },
    line: { position: "absolute" as const, top: 16, bottom: -6, width: 2, backgroundColor: c.border },
    rowCopy: { flex: 1, gap: 6, paddingBottom: spacing.lg },
    month: { ...typography.section, color: c.text },
    metaRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, flexWrap: "wrap" as const },
    meta: { ...typography.caption, color: c.mutedForeground },
    amount: { ...typography.section, fontSize: 16, color: c.text, fontVariant: ["tabular-nums" as const] },
  }))

  const years = groupPayoutsByYear(payouts.data?.items ?? [])

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.title} accessibilityRole="header">
          Earnings
        </Text>
        <Text style={styles.subtitle}>What Admobi has paid you and what&apos;s on its way.</Text>
      </View>

      <PayoutKpis />

      <PayoutMonthsChart />

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Payout history" />

        {payouts.isError && !payouts.data ? (
          <View style={styles.note} accessibilityLiveRegion="polite">
            <Text style={styles.noteText}>Your history didn&apos;t load.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void payouts.refetch()}
              style={({ pressed }) => [styles.retry, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.retryText}>{payouts.isFetching ? "Trying again…" : "Try again"}</Text>
            </Pressable>
          </View>
        ) : !payouts.data ? (
          <View style={{ gap: spacing.md, paddingLeft: 36 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} height={40} />
            ))}
          </View>
        ) : years.length === 0 ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>Nothing here yet. Each monthly payout is added the moment Admobi saves it.</Text>
          </View>
        ) : (
          years.map((group) => (
            <View key={group.year}>
              <View style={styles.yearRow}>
                <Text style={styles.year} accessibilityRole="header">
                  {group.year}
                </Text>
                <Text style={styles.yearPaid}>{group.paidKes > 0 ? `${formatKes(group.paidKes)} paid` : "Nothing paid yet"}</Text>
              </View>
              {group.items.map((p, index) => {
                const tone = toneFor(p.status, colors)
                const isLast = index === group.items.length - 1
                const struck = p.status === "failed" || p.status === "reversed"
                const label = PAYOUT_STATUS_LABEL[p.status] ?? p.status
                return (
                  <Animated.View
                    key={p.id}
                    entering={FadeIn.duration(250).delay(Math.min(index, 8) * 40)}
                    style={styles.row}
                    accessible
                    accessibilityLabel={`${monthName(p.periodMonth)}, ${formatKes(p.amountKes)}, ${label}${p.paidAt ? `, ${formatPayoutDate(p.paidAt)}` : ""}`}
                  >
                    {/* The route: a node per payout, joined by a line to the one before. */}
                    <View style={styles.rail}>
                      <View style={[styles.node, { backgroundColor: tone.fill, borderColor: tone.ring }]} />
                      {isLast ? null : <View style={styles.line} />}
                    </View>
                    <View style={[styles.rowCopy, isLast && { paddingBottom: 0 }]}>
                      <Text style={styles.month}>{monthName(p.periodMonth)}</Text>
                      <View style={styles.metaRow}>
                        <Pill label={label} tone={tone.pill} />
                        {p.paidAt ? <Text style={styles.meta}>{formatPayoutDate(p.paidAt)}</Text> : null}
                      </View>
                    </View>
                    <Text
                      style={[styles.amount, struck && { color: colors.mutedForeground, textDecorationLine: "line-through" as const }]}
                    >
                      {formatKes(p.amountKes)}
                    </Text>
                  </Animated.View>
                )
              })}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

export default withProfileGate(EarningsScreen)
