import { Link } from "expo-router"
import { useEffect } from "react"
import { Pressable, Text, View } from "react-native"
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated"

import { PAYOUT_STAGES, payoutFocus, type PayoutFocus } from "@workspace/ops-contracts"

import { SkeletonBlock } from "@/components/app/skeleton"
import { Check, ChevronRight, Warning, X } from "@/components/icons"
import { formatKes, formatPayoutDate, monthName, PAYOUT_STATUS_LABEL, useDriverPayouts } from "@/lib/driver-payouts"
import { radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from "@/lib/theme"

type Props = {
  /** "M-Pesa ••• 4521"; null when the profile has no payout details. */
  destination: string | null
  showHistoryLink?: boolean
}

/**
 * The driver's one question, answered first: what is coming to my M-Pesa and
 * where is it. Mirrors apps/driver-web's PayoutHero: the newest payout as a
 * three-stop route (Saved → Sending → Paid), year totals underneath.
 */
export function PayoutHero({ destination, showHistoryLink = false }: Props) {
  const { data, isError, isFetching, refetch } = useDriverPayouts()
  const styles = useHeroStyles()
  const to = destination ?? "your M-Pesa or bank"

  if (isError && !data) {
    return (
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text style={styles.problemTitle}>We couldn&apos;t load your payouts</Text>
        <Text style={styles.sentence}>
          Your money is safe. This is a connection problem on our side or yours. Try again in a moment.
        </Text>
        <Pressable
          onPress={() => void refetch()}
          disabled={isFetching}
          accessibilityRole="button"
          style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
        >
          <Text style={styles.outlineButtonText}>{isFetching ? "Trying again…" : "Try again"}</Text>
        </Pressable>
      </View>
    )
  }

  if (!data) return <PayoutHeroSkeleton />

  const focus = payoutFocus(data)
  const { summary } = data

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.card}>
      <View style={{ gap: spacing.sm }}>
        <View style={styles.headingRow}>
          <StatusMark focus={focus} />
          <Text style={styles.heading} accessibilityRole="header">
            {headingFor(focus)}
          </Text>
        </View>
        {focus.kind === "none" ? (
          <Text style={styles.emptyAmount}>No payouts yet</Text>
        ) : (
          <Text
            style={[styles.amount, focus.kind === "problem" && styles.amountProblem]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {formatKes(focus.payout.amountKes)}
          </Text>
        )}
        <Text style={styles.sentence}>{sentenceFor(focus, to)}</Text>
      </View>

      <PayoutRoute focus={focus} />

      {focus.kind === "problem" ? (
        <View style={styles.actions}>
          <Link href="/settings" asChild>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Check payout details</Text>
            </Pressable>
          </Link>
          <Link href="/support" asChild>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
              <Text style={styles.outlineButtonText}>Ask support</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <View style={styles.figures}>
        <Figure label="Paid this year" value={formatKes(summary.paidThisYearKes)} />
        <Figure label="On its way" value={formatKes(summary.pendingKes)} />
        {focus.kind !== "paid" && summary.lastPayout ? (
          <Figure
            label={`Last paid ${formatPayoutDate(summary.lastPayout.paidAt)}`}
            value={formatKes(summary.lastPayout.amountKes)}
          />
        ) : null}
      </View>

      {showHistoryLink ? (
        <Link href="/earnings" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}>
            <Text style={styles.historyLinkText}>All payouts</Text>
            <ChevronRight size={16} color={styles.historyLinkText.color} />
          </Pressable>
        </Link>
      ) : null}
    </Animated.View>
  )
}

function headingFor(focus: PayoutFocus): string {
  if (focus.kind === "none") return "Your payouts"
  const month = monthName(focus.payout.periodMonth)
  if (focus.kind === "in_flight") return `${month} payout · on its way`
  if (focus.kind === "paid") return `${month} payout · paid`
  return `${month} payout · ${(PAYOUT_STATUS_LABEL[focus.payout.status] ?? focus.payout.status).toLowerCase()}`
}

function sentenceFor(focus: PayoutFocus, to: string): string {
  switch (focus.kind) {
    case "none":
      return `Admobi pays you straight to ${to}. Your first payout shows up here as soon as it's saved.`
    case "in_flight":
      return focus.stage === 0 ? `Saved by Admobi and queued to send to ${to}.` : `Sending now to ${to}.`
    case "paid":
      return `Paid to ${to}${focus.payout.paidAt ? ` on ${formatPayoutDate(focus.payout.paidAt)}` : ""}.`
    case "problem":
      return focus.payout.status === "reversed"
        ? `This payment to ${to} was reversed. Check your payout details, or ask support what happened.`
        : `This payment to ${to} didn't go through. Usually the number or account is wrong. Check it, or ask support.`
  }
}

function StatusMark({ focus }: { focus: PayoutFocus }) {
  const colors = useThemeColors()
  if (focus.kind === "problem") return <Warning size={16} color={colors.destructive} />
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: radius.full,
        backgroundColor: focus.kind === "none" ? colors.border : colors.primary,
      }}
    />
  )
}

/** Saved → Sending → Paid, as nodes on a line. */
function PayoutRoute({ focus }: { focus: PayoutFocus }) {
  const colors = useThemeColors()
  const reached = focus.kind === "none" ? -1 : focus.stage

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }} accessibilityLabel="Payout progress">
      {PAYOUT_STAGES.map((label, i) => {
        const isProblem = focus.kind === "problem" && i === reached
        const isCurrent = focus.kind === "in_flight" && i === reached
        const isDone = i < reached || (focus.kind === "paid" && i === reached)
        const text = isProblem ? (PAYOUT_STATUS_LABEL[focus.payout.status] ?? label) : label
        const state = isProblem ? "stopped here" : isCurrent ? "in progress" : isDone ? "done" : "not yet"
        const isLast = i === PAYOUT_STAGES.length - 1

        return (
          <View
            key={label}
            style={{ flex: isLast ? 0 : 1, gap: spacing.sm }}
            accessible
            accessibilityLabel={`${text}, ${state}`}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Node colors={colors} done={isDone} current={isCurrent} problem={isProblem} />
              {isLast ? null : (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    marginHorizontal: 6,
                    borderRadius: 1,
                    backgroundColor: i < reached ? colors.primary : colors.border,
                  }}
                />
              )}
            </View>
            <Text
              style={{
                ...typography.caption,
                fontWeight: "600",
                color: isProblem ? colors.destructive : isDone || isCurrent ? colors.text : colors.mutedForeground,
              }}
            >
              {text}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function Node({
  colors,
  done,
  current,
  problem,
}: {
  colors: ThemeColors
  done: boolean
  current: boolean
  problem: boolean
}) {
  const reduceMotion = useReducedMotion()
  const pulse = useSharedValue(0)

  useEffect(() => {
    if (!current || reduceMotion) return
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.exp) }), -1, false)
  }, [current, reduceMotion, pulse])

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - pulse.value),
    transform: [{ scale: 1 + 0.8 * pulse.value }],
  }))

  const size = 20
  const base = { width: size, height: size, borderRadius: radius.full, alignItems: "center" as const, justifyContent: "center" as const }

  if (problem) {
    return (
      <View style={[base, { backgroundColor: colors.destructive }]}>
        <X size={12} color="#FFFFFF" />
      </View>
    )
  }
  if (done) {
    return (
      <View style={[base, { backgroundColor: colors.primary }]}>
        <Check size={12} color={colors.primaryForeground} />
      </View>
    )
  }
  return (
    <View style={[base, { borderWidth: 2, borderColor: current ? colors.primary : colors.border, backgroundColor: colors.bg }]}>
      {current ? (
        <>
          <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary }} />
          <Animated.View
            pointerEvents="none"
            style={[
              { position: "absolute", width: size, height: size, borderRadius: radius.full, borderWidth: 2, borderColor: colors.primary },
              ringStyle,
            ]}
          />
        </>
      ) : null}
    </View>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  const styles = useHeroStyles()
  return (
    <View style={{ gap: 2, minWidth: "40%" }}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={styles.figureValue}>{value}</Text>
    </View>
  )
}

export function PayoutHeroSkeleton() {
  const styles = useHeroStyles()
  return (
    <View style={styles.card} accessibilityLabel="Loading your payouts">
      <View style={{ gap: spacing.sm }}>
        <SkeletonBlock width="55%" height={14} />
        <SkeletonBlock width="75%" height={48} borderRadius={radius.md} />
        <SkeletonBlock width="90%" height={14} />
      </View>
      <SkeletonBlock height={40} borderRadius={radius.md} />
      <View style={[styles.figures, { gap: spacing.xl }]}>
        <SkeletonBlock width={90} height={34} />
        <SkeletonBlock width={90} height={34} />
      </View>
    </View>
  )
}

function useHeroStyles() {
  return useThemedStyles((c) => ({
    card: {
      gap: spacing.lg + spacing.sm,
      padding: spacing.lg + spacing.xs,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    headingRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
    heading: { ...typography.label, color: c.mutedForeground, flexShrink: 1 },
    amount: {
      fontSize: 46,
      lineHeight: 52,
      fontWeight: "700" as const,
      letterSpacing: -1.4,
      color: c.text,
      fontVariant: ["tabular-nums" as const],
    },
    amountProblem: {
      color: c.mutedForeground,
      textDecorationLine: "line-through" as const,
      textDecorationColor: c.destructive,
    },
    emptyAmount: { ...typography.title, fontSize: 28, color: c.text },
    sentence: { ...typography.body, color: c.mutedForeground },
    problemTitle: { ...typography.headline, color: c.text },
    actions: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    primaryButton: {
      minHeight: 48,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    primaryButtonText: { ...typography.section, color: c.primaryForeground },
    outlineButton: {
      minHeight: 48,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      alignSelf: "flex-start" as const,
    },
    outlineButtonText: { ...typography.section, color: c.text },
    pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
    figures: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      rowGap: spacing.md,
      columnGap: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    figureLabel: { ...typography.caption, color: c.mutedForeground },
    figureValue: { ...typography.section, fontSize: 16, color: c.text, fontVariant: ["tabular-nums" as const] },
    historyLink: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, alignSelf: "flex-start" as const, minHeight: 44 },
    historyLinkText: { ...typography.section, color: c.primary },
  }))
}
