"use client"

import { useId, useMemo, useState } from "react"

import {
  calculateCampaignEstimate,
  flightDaysBetween,
  formatKes,
  formatKesPrecise,
  slotLengthOptions,
  bikeSidesOptions,
  zoneForMarket,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { NumberStepper, clampInt } from "@workspace/ui/components/number-stepper"
import { useAnimatedNumber } from "@workspace/ui/hooks/use-animated-number"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The wizard's budget estimator.
 *
 * Not the marketing page's simulator with a different button on it: that one
 * asks a visitor to pick a zone and a hardware model from scratch, and this
 * one already knows both from step one. Market decides the zone, format
 * decides which panels are priced (and a delivery-bike campaign is priced on
 * the per-side-per-day model, never the taxi-top per-play one), and the flight
 * dates decide the length. What's left is the handful of things the wizard
 * genuinely can't know — how many screens, how long a slot, how many sides.
 *
 * The arithmetic is shared, not copied: calculateCampaignEstimate and the rate
 * card live in @workspace/ops-contracts, which the pricing page, this screen
 * and the Expo app all read from, so no surface can quote a different number.
 */

const SCREENS_MIN = 1
const SCREENS_MAX = 500
const BIKES_MIN = 1
const BIKES_MAX = 500
const PLAYS_MIN = 1
const PLAYS_MAX = 120

function ReceiptRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", strong && "font-semibold text-foreground")}>
      <dt className={cn("truncate", strong ? "text-foreground" : "text-muted-foreground")}>{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  )
}

/** Segmented control shared by slot length and enclosure sides — both are a
 * short list of options each carrying a multiplier. */
function MultiplierChoices<T extends { label: string; multiplier: number }>({
  legend,
  options,
  isActive,
  onSelect,
  digits = 1,
}: {
  legend: string
  options: readonly T[]
  isActive: (option: T) => boolean
  onSelect: (option: T) => void
  digits?: number
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = isActive(option)
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-transparent hover:bg-muted",
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "text-[0.65rem] font-normal tabular-nums",
                  active ? "text-primary-foreground/75" : "text-muted-foreground",
                )}
              >
                {option.multiplier.toFixed(digits)}x
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
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
  /** Writes the estimate into the wizard's budget field. */
  onApply: (total: number) => void
}) {
  const [screens, setScreens] = useState(20)
  const [slotSeconds, setSlotSeconds] = useState(15)
  const [playsPerDay, setPlaysPerDay] = useState(20)
  const [bikes, setBikes] = useState(20)
  const [sides, setSides] = useState(1)

  const screensId = useId()
  const bikesId = useId()
  const playsId = useId()

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

  const animatedTotal = useAnimatedNumber(estimate.total)

  if (days === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Pick your start and end dates above and we&apos;ll price the flight for you on the same
        rate card the pricing page quotes.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-muted-foreground">Priced from your brief</span>
          <span className="font-medium">
            {zone.name} · {zone.multiplier.toFixed(1)}x
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {market ? `${market} bills at the ${zone.name.toLowerCase()} rate.` : "No market picked yet — quoted at the base rate."}{" "}
          {days} day{days === 1 ? "" : "s"} from your flight dates.
        </p>
      </div>

      {showScreens ? (
        <div className="space-y-4">
          {format === "both" ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Taxi-top LED
            </p>
          ) : null}
          <NumberStepper
            id={screensId}
            label="Number of screens"
            value={screens}
            min={SCREENS_MIN}
            max={SCREENS_MAX}
            onChange={setScreens}
            hint="10+ unlocks the 0.9x volume rate, 50+ unlocks 0.8x."
          />
          <MultiplierChoices
            legend="Ad slot length"
            options={slotLengthOptions}
            isActive={(option) => option.seconds === slotSeconds}
            onSelect={(option) => setSlotSeconds(option.seconds)}
          />
          <div className="grid gap-2">
            <Label htmlFor={playsId}>Plays per day, per screen</Label>
            <div className="flex items-center gap-3">
              <input
                id={playsId}
                type="range"
                min={PLAYS_MIN}
                max={PLAYS_MAX}
                value={playsPerDay}
                onChange={(event) =>
                  setPlaysPerDay(clampInt(Number(event.target.value), PLAYS_MIN, PLAYS_MAX))
                }
                className="h-1.5 w-full accent-primary"
              />
              <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">
                {playsPerDay}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {showBikes ? (
        <div className="space-y-4">
          {format === "both" ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery bike
            </p>
          ) : null}
          <NumberStepper
            id={bikesId}
            label="Number of bikes"
            value={bikes}
            min={BIKES_MIN}
            max={BIKES_MAX}
            onChange={setBikes}
            hint="10+ unlocks the 0.9x volume rate, 50+ unlocks 0.8x."
          />
          <MultiplierChoices
            legend="Enclosure sides"
            options={bikeSidesOptions}
            isActive={(option) => option.sides === sides}
            onSelect={(option) => setSides(option.sides)}
            digits={2}
          />
          {/* Bikes are static, not a rotating loop — no plays-per-day control
              here, because a booked side is exclusively yours for the flight. */}
          <p className="text-xs text-muted-foreground">
            A booked side is yours for the whole flight — bike enclosures are static, so there is
            no loop to share.
          </p>
        </div>
      ) : null}

      <div
        aria-live="polite"
        className="overflow-hidden rounded-xl border bg-background"
      >
        <div className="px-4 pt-4">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Campaign estimate
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {formatKes(animatedTotal)}
          </p>
        </div>

        <dl className="mt-4 space-y-2 border-t border-dashed px-4 py-4 font-mono text-[0.75rem]">
          {estimate.screen ? (
            <>
              <ReceiptRow
                label="Taxi-top, price per play"
                value={formatKesPrecise(estimate.screen.pricePerPlay)}
              />
              <ReceiptRow
                label={`× ${playsPerDay} plays × ${screens} screen${screens === 1 ? "" : "s"} × ${days}d`}
                value={formatKes(estimate.screen.total)}
                strong
              />
            </>
          ) : null}
          {estimate.bike ? (
            <>
              <ReceiptRow
                label="Bike, price per side / day"
                value={formatKesPrecise(estimate.bike.pricePerSidePerDay)}
              />
              <ReceiptRow
                label={`× ${sides} side${sides === 1 ? "" : "s"} × ${bikes} bike${bikes === 1 ? "" : "s"} × ${days}d`}
                value={formatKes(estimate.bike.total)}
                strong
              />
            </>
          ) : null}
        </dl>

        <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-3">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Total
          </span>
          <span className="text-lg font-semibold tabular-nums">{formatKes(estimate.total)}</span>
        </div>
      </div>

      <Button type="button" className="w-full" onClick={() => onApply(estimate.total)}>
        Use {formatKes(estimate.total)} as my budget
      </Button>
    </div>
  )
}
