import { Link } from "expo-router"
import { useEffect } from "react"
import { Pressable, Text, View } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { PAYOUT_STAGES, payoutFocus, type PayoutFocus } from "@workspace/ops-contracts"

import { SkeletonBlock } from "@/components/app/skeleton"
import { Check, ChevronRight, Warning, X } from "@/components/icons"
import { formatKes, formatPayoutDate, monthName, PAYOUT_STATUS_LABEL, useDriverPayouts } from "@/lib/driver-payouts"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type Props = {
  /** "M-Pesa ••• 4521"; null when the profile has no payout details. */
  destination: string | null
  showHistoryLink?: boolean
}

/** `#rrggbb` at `alpha` (0..1). Anything that isn't a 6-digit hex is returned untouched. */
const withAlpha = (hex: string, alpha: number) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}` : hex

/** Everything the card draws in, so the brand card and the plain card share one layout. */
type Ink = { bg: string; text: string; soft: string; faint: string; onDone: string }

/**
 * The driver's one question, answered first: what is coming to my M-Pesa, and where is it.
 *
 * Money on its way or just landed gets the brand surface (the single saturated accent, full width), told as
 * a journey: the month, the amount, one plain sentence, and Saved → Sending → Paid as nodes on a line. A
 * problem stays on a plain surface with the fix beside it, because the accent should never dress up bad news.
 */
export function PayoutHero({ destination, showHistoryLink = false }: Props) {
  const { data, isError, isFetching, refetch } = useDriverPayouts()
  const c = useThemeColors()
  const styles = useHeroStyles()
  const to = destination ?? "your M-Pesa or bank"

  if (isError && !data) {
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]} accessibilityLiveRegion="polite">
        <Text style={styles.problemTitle}>We couldn&apos;t load your payouts</Text>
        <Text style={[styles.sentence, { color: c.mutedForeground }]}>
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
  const brand = focus.kind === "in_flight" || focus.kind === "paid"
  const ink: Ink = brand
    ? { bg: c.primary, text: c.primaryForeground, soft: withAlpha(c.primaryForeground, 0.86), faint: withAlpha(c.primaryForeground, 0.4), onDone: c.primary }
    : { bg: c.card, text: c.text, soft: c.mutedForeground, faint: c.border, onDone: c.primaryForeground }

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[
        styles.card,
        { backgroundColor: ink.bg },
        brand ? styles.brandShadow : { borderWidth: 1, borderColor: c.border },
        brand && { shadowColor: c.primary },
      ]}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={styles.headingRow}>
          {focus.kind === "problem" ? <Warning size={16} color={c.destructive} /> : null}
          {focus.kind === "paid" ? <Check size={16} color={ink.text} /> : null}
          <Text style={[styles.heading, { color: ink.soft }]} accessibilityRole="header">
            {headingFor(focus)}
          </Text>
        </View>

        {focus.kind === "none" ? (
          <Text style={[styles.emptyAmount, { color: ink.text }]}>No payouts yet</Text>
        ) : (
          <Animated.Text
            // The one authored moment: the amount settles in once when it has just landed.
            entering={focus.kind === "paid" ? FadeInDown.duration(500).easing(Easing.out(Easing.exp)) : undefined}
            style={[styles.amount, { color: focus.kind === "problem" ? c.mutedForeground : ink.text }, focus.kind === "problem" && { textDecorationLine: "line-through", textDecorationColor: c.destructive }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {formatKes(focus.payout.amountKes)}
          </Animated.Text>
        )}
        <Text style={[styles.sentence, { color: ink.soft }]}>{sentenceFor(focus, to)}</Text>
      </View>

      <PayoutRoute focus={focus} ink={ink} />

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

      {showHistoryLink ? (
        <Link href="/earnings" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}>
            <Text style={[styles.historyLinkText, { color: brand ? ink.text : c.primary }]}>All payouts</Text>
            <ChevronRight size={16} color={brand ? ink.text : c.primary} />
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

/** Saved → Sending → Paid, as nodes on a line. */
function PayoutRoute({ focus, ink }: { focus: PayoutFocus; ink: Ink }) {
  const c = useThemeColors()
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
          <View key={label} style={{ flex: isLast ? 0 : 1, gap: spacing.sm }} accessible accessibilityLabel={`${text}, ${state}`}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Node ink={ink} done={isDone} current={isCurrent} problem={isProblem} destructive={c.destructive} />
              {isLast ? null : (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    marginHorizontal: 6,
                    borderRadius: 1,
                    backgroundColor: i < reached ? ink.text : ink.faint,
                  }}
                />
              )}
            </View>
            <Text
              style={{
                ...typography.caption,
                fontWeight: "600",
                color: isProblem ? c.destructive : isDone || isCurrent ? ink.text : ink.soft,
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

function Node({ ink, done, current, problem, destructive }: { ink: Ink; done: boolean; current: boolean; problem: boolean; destructive: string }) {
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

  const size = 22
  const base = { width: size, height: size, borderRadius: radius.full, alignItems: "center" as const, justifyContent: "center" as const }

  if (problem) {
    return (
      <View style={[base, { backgroundColor: destructive }]}>
        <X size={12} color="#FFFFFF" />
      </View>
    )
  }
  if (done) {
    return (
      <View style={[base, { backgroundColor: ink.text }]}>
        <Check size={13} color={ink.onDone} />
      </View>
    )
  }
  return (
    <View style={[base, { borderWidth: 2, borderColor: current ? ink.text : ink.faint }]}>
      {current ? (
        <>
          <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: ink.text }} />
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", width: size, height: size, borderRadius: radius.full, borderWidth: 2, borderColor: ink.text }, ringStyle]}
          />
        </>
      ) : null}
    </View>
  )
}

export function PayoutHeroSkeleton() {
  const styles = useHeroStyles()
  const c = useThemeColors()
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderWidth: 1, borderColor: c.border }]} accessibilityLabel="Loading your payouts">
      <View style={{ gap: spacing.sm }}>
        <SkeletonBlock width="55%" height={14} />
        <SkeletonBlock width="75%" height={52} borderRadius={radius.md} />
        <SkeletonBlock width="90%" height={14} />
      </View>
      <SkeletonBlock height={40} borderRadius={radius.md} />
    </View>
  )
}

function useHeroStyles() {
  return useThemedStyles((c) => ({
    card: {
      gap: spacing.xl,
      padding: spacing.lg + spacing.sm,
      borderRadius: radius["2xl"] + 4,
    },
    // Soft, tinted, offset down: depth without a hard edge.
    brandShadow: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 6 },
    headingRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
    heading: { ...typography.label, flexShrink: 1 },
    amount: {
      fontSize: 52,
      lineHeight: 58,
      fontWeight: "700" as const,
      letterSpacing: -1.6,
      fontVariant: ["tabular-nums" as const],
    },
    emptyAmount: { ...typography.title, fontSize: 28 },
    sentence: { ...typography.body },
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
    historyLink: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, alignSelf: "flex-start" as const, minHeight: 44 },
    historyLinkText: { ...typography.section },
  }))
}
