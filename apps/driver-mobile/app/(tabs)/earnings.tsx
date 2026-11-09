import { useCallback, useState } from "react"
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { payoutDestinationLabel } from "@workspace/ops-contracts"

import { SkeletonBlock } from "@/components/app/skeleton"
import { PayoutHero } from "@/components/payout-hero"
import { withProfileGate } from "@/components/profile-setup/with-profile-gate"
import { formatKes, formatPayoutDate, monthName, PAYOUT_STATUS_LABEL, useDriverPayouts } from "@/lib/driver-payouts"
import { useDriverProfile } from "@/lib/driver-profile"
import { spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from "@/lib/theme"

function toneFor(status: string, c: ThemeColors) {
  if (status === "settled") return { fill: c.primary, ring: c.primary, badgeBg: c.accentSurface, badgeText: c.primary }
  if (status === "failed" || status === "reversed")
    return { fill: c.destructive, ring: c.destructive, badgeBg: c.destructiveMuted, badgeText: c.destructive }
  if (status === "pending" || status === "processing")
    return { fill: c.bg, ring: c.primary, badgeBg: c.muted, badgeText: c.text }
  return { fill: c.bg, ring: c.border, badgeBg: c.muted, badgeText: c.mutedForeground }
}

/**
 * Real payouts only. Screen-on hours, distance and per-day earnings are not
 * shown: nothing records them yet, and an invented number is worse than none.
 */
function EarningsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const payouts = useDriverPayouts()
  const { profile } = useDriverProfile()
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
    sectionTitle: { ...typography.headline, fontSize: 18, color: c.text },
    note: {
      padding: spacing.lg,
      borderRadius: 20,
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
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: "center" as const,
    },
    retryText: { ...typography.section, color: c.text },
    row: { flexDirection: "row" as const, gap: spacing.md },
    rail: { width: 20, alignItems: "center" as const },
    node: { marginTop: 4, width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 1 },
    line: { position: "absolute" as const, top: 16, bottom: -6, width: 2, backgroundColor: c.border },
    rowCopy: { flex: 1, gap: 6, paddingBottom: spacing.lg },
    month: { ...typography.section, color: c.text },
    metaRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, flexWrap: "wrap" as const },
    badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { ...typography.caption, fontWeight: "600" as const },
    meta: { ...typography.caption, color: c.mutedForeground },
    amount: { ...typography.section, fontSize: 16, color: c.text, fontVariant: ["tabular-nums" as const] },
  }))

  const items = payouts.data?.items ?? []

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.title} accessibilityRole="header">
          Earnings
        </Text>
        <Text style={styles.subtitle}>What Admobi has paid you and what&apos;s on its way.</Text>
      </View>

      <PayoutHero destination={profile ? payoutDestinationLabel(profile) : null} />

      <View style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Payout history
        </Text>

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
        ) : items.length === 0 ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>Nothing here yet. Each monthly payout is added the moment Admobi saves it.</Text>
          </View>
        ) : (
          <View>
            {items.map((p, index) => {
              const tone = toneFor(p.status, colors)
              const isLast = index === items.length - 1
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
                      <View style={[styles.badge, { backgroundColor: tone.badgeBg }]}>
                        <Text style={[styles.badgeText, { color: tone.badgeText }]}>{label}</Text>
                      </View>
                      {p.paidAt ? <Text style={styles.meta}>{formatPayoutDate(p.paidAt)}</Text> : null}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.amount,
                      struck && { color: colors.mutedForeground, textDecorationLine: "line-through" as const },
                    ]}
                  >
                    {formatKes(p.amountKes)}
                  </Text>
                </Animated.View>
              )
            })}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default withProfileGate(EarningsScreen)
