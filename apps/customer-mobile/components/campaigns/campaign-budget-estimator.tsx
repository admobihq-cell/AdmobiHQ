import { useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"

import {
  bikeSidesOptions,
  calculateCampaignEstimate,
  flightDaysBetween,
  formatKes,
  formatKesPrecise,
  slotLengthOptions,
  zoneForMarket,
} from "@workspace/ops-contracts"

import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

/**
 * The Expo twin of apps/customer-web's CampaignBudgetEstimator.
 *
 * The layout is native (no shared component can span React DOM and React
 * Native), but the arithmetic is not re-implemented: zoneForMarket and
 * calculateCampaignEstimate come from @workspace/ops-contracts, the same rate
 * card the marketing pricing page and the web wizard price against. If the
 * rate card moves, all three move together — there is no second copy of the
 * numbers to forget.
 *
 * Steppers rather than the web's range slider: no slider dependency is
 * installed here, and a stepper is the more reliable target on a phone.
 */

const SCREEN_STEPS = [5, 10, 20, 50, 100] as const
const BIKE_STEPS = [5, 10, 20, 50, 100] as const
const PLAYS_STEPS = [10, 20, 40, 60] as const

function OptionRow<T>({
  label,
  options,
  isActive,
  onSelect,
  render,
}: {
  label: string
  options: readonly T[]
  isActive: (option: T) => boolean
  onSelect: (option: T) => void
  render: (option: T) => { title: string; hint?: string }
}) {
  const styles = useThemedStyles((c) => ({
    group: { gap: spacing.sm },
    label: { ...typography.label, color: c.text, fontWeight: "600" as const },
    row: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center" as const,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { ...typography.bodySm, color: c.text, fontWeight: "600" as const },
    chipTextActive: { color: c.primaryForeground },
    chipHint: { ...typography.caption, color: c.mutedForeground },
    chipHintActive: { color: c.primaryForeground, opacity: 0.75 },
  }))

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option, index) => {
          const active = isActive(option)
          const { title, hint } = render(option)
          return (
            <Pressable
              key={index}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{title}</Text>
              {hint ? (
                <Text style={[styles.chipHint, active && styles.chipHintActive]}>{hint}</Text>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function CampaignBudgetEstimator({
  format,
  market,
  startsOn,
  endsOn,
  onApply,
}: {
  format: string
  market: string | null
  startsOn: string
  endsOn: string
  onApply: (total: number) => void
}) {
  const [screens, setScreens] = useState<number>(20)
  const [slotSeconds, setSlotSeconds] = useState<number>(15)
  const [playsPerDay, setPlaysPerDay] = useState<number>(20)
  const [bikes, setBikes] = useState<number>(20)
  const [sides, setSides] = useState<number>(1)

  const zone = zoneForMarket(market)
  const days = flightDaysBetween(startsOn, endsOn)
  const showScreens = format === "taxi_top" || format === "both"
  const showBikes = format === "delivery_bike" || format === "both"

  const estimate = useMemo(
    () =>
      calculateCampaignEstimate({
        format,
        zoneMultiplier: zone.multiplier,
        days,
        screens,
        slotSeconds,
        playsPerDay,
        bikes,
        sides,
      }),
    [format, zone.multiplier, days, screens, slotSeconds, playsPerDay, bikes, sides],
  )

  const styles = useThemedStyles((c) => ({
    wrap: { gap: spacing.md },
    empty: {
      ...typography.bodySm,
      color: c.mutedForeground,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
    },
    basis: {
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: 2,
    },
    basisRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    basisLabel: { ...typography.bodySm, color: c.mutedForeground },
    basisValue: { ...typography.bodySm, color: c.text, fontWeight: "600" as const },
    basisHint: { ...typography.caption, color: c.mutedForeground },
    panelLabel: {
      ...typography.caption,
      color: c.mutedForeground,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    receipt: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: "hidden" as const,
    },
    receiptHead: { padding: spacing.md, gap: 2 },
    receiptCaption: {
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
    },
    receiptTotal: { ...typography.largeTitle, fontSize: 28, color: c.text },
    receiptBody: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.xs,
    },
    receiptRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    receiptRowLabel: { ...typography.caption, color: c.mutedForeground, flexShrink: 1 },
    receiptRowValue: { ...typography.caption, color: c.text, fontWeight: "600" as const },
    apply: {
      alignItems: "center" as const,
      paddingVertical: 14,
      borderRadius: radius.md,
      backgroundColor: c.primary,
    },
    applyText: { ...typography.label, color: c.primaryForeground, fontWeight: "700" as const },
  }))

  if (days === 0) {
    return (
      <Text style={styles.empty}>
        Add your start and end dates above and we&apos;ll price the flight on the same rate card
        the website quotes.
      </Text>
    )
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.basis}>
        <View style={styles.basisRow}>
          <Text style={styles.basisLabel}>Priced from your brief</Text>
          <Text style={styles.basisValue}>
            {zone.name} · {zone.multiplier.toFixed(1)}x
          </Text>
        </View>
        <Text style={styles.basisHint}>
          {market
            ? `${market} bills at the ${zone.name.toLowerCase()} rate.`
            : "No market picked yet — quoted at the base rate."}{" "}
          {days} day{days === 1 ? "" : "s"} from your flight dates.
        </Text>
      </View>

      {showScreens ? (
        <>
          {format === "both" ? <Text style={styles.panelLabel}>Taxi-top LED</Text> : null}
          <OptionRow
            label="Number of screens"
            options={SCREEN_STEPS}
            isActive={(option) => option === screens}
            onSelect={setScreens}
            render={(option) => ({ title: String(option) })}
          />
          <OptionRow
            label="Ad slot length"
            options={slotLengthOptions}
            isActive={(option) => option.seconds === slotSeconds}
            onSelect={(option) => setSlotSeconds(option.seconds)}
            render={(option) => ({ title: option.label, hint: `${option.multiplier.toFixed(1)}x` })}
          />
          <OptionRow
            label="Plays per day, per screen"
            options={PLAYS_STEPS}
            isActive={(option) => option === playsPerDay}
            onSelect={setPlaysPerDay}
            render={(option) => ({ title: String(option) })}
          />
        </>
      ) : null}

      {showBikes ? (
        <>
          {format === "both" ? <Text style={styles.panelLabel}>Delivery bike</Text> : null}
          <OptionRow
            label="Number of bikes"
            options={BIKE_STEPS}
            isActive={(option) => option === bikes}
            onSelect={setBikes}
            render={(option) => ({ title: String(option) })}
          />
          <OptionRow
            label="Enclosure sides"
            options={bikeSidesOptions}
            isActive={(option) => option.sides === sides}
            onSelect={(option) => setSides(option.sides)}
            render={(option) => ({ title: option.label, hint: `${option.multiplier.toFixed(2)}x` })}
          />
        </>
      ) : null}

      <View style={styles.receipt}>
        <View style={styles.receiptHead}>
          <Text style={styles.receiptCaption}>Campaign estimate</Text>
          <Text style={styles.receiptTotal}>{formatKes(estimate.total)}</Text>
        </View>
        <View style={styles.receiptBody}>
          {estimate.screen ? (
            <>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Taxi-top, per play</Text>
                <Text style={styles.receiptRowValue}>
                  {formatKesPrecise(estimate.screen.pricePerPlay)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>
                  {playsPerDay} plays × {screens} screen{screens === 1 ? "" : "s"} × {days}d
                </Text>
                <Text style={styles.receiptRowValue}>{formatKes(estimate.screen.total)}</Text>
              </View>
            </>
          ) : null}
          {estimate.bike ? (
            <>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Bike, per side / day</Text>
                <Text style={styles.receiptRowValue}>
                  {formatKesPrecise(estimate.bike.pricePerSidePerDay)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>
                  {sides} side{sides === 1 ? "" : "s"} × {bikes} bike{bikes === 1 ? "" : "s"} ×{" "}
                  {days}d
                </Text>
                <Text style={styles.receiptRowValue}>{formatKes(estimate.bike.total)}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <Pressable
        style={styles.apply}
        onPress={() => onApply(estimate.total)}
        accessibilityRole="button"
      >
        <Text style={styles.applyText}>Use {formatKes(estimate.total)} as my budget</Text>
      </Pressable>
    </View>
  )
}
