"use client"

import { useId, useMemo, useState } from "react"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import {
  BASE_PRICE_PER_PLAY_KES,
  allScreensFlatMultiplier,
  calculateSimulatorPrice,
  formatKes,
  formatKesPrecise,
  slotLengthOptions,
  zoneTiers,
} from "@/lib/seo/pricing-data"
import { useAnimatedNumber } from "@/components/pricing/use-animated-number"
import { NumberStepper, clampInt } from "@/components/pricing/number-stepper"

type ZoneChoiceId = (typeof zoneTiers)[number]["id"] | "all-screens"

const zoneChoices: readonly { id: ZoneChoiceId; name: string; multiplier: number; hint: string }[] = [
  ...zoneTiers.map((zone) => ({
    id: zone.id as ZoneChoiceId,
    name: zone.name,
    multiplier: zone.multiplier,
    hint: zone.examples.slice(0, 2).join(", "),
  })),
  {
    id: "all-screens",
    name: "All screens",
    multiplier: allScreensFlatMultiplier,
    hint: "Flat citywide rate",
  },
]

const SCREENS_MIN = 1
const SCREENS_MAX = 500
const PLAYS_MIN = 1
const PLAYS_MAX = 120
const DAYS_MIN = 1
const DAYS_MAX = 90

function ReceiptRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", strong && "text-foreground font-semibold")}>
      <dt className={cn("truncate", strong ? "text-foreground" : "text-muted-foreground")}>{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  )
}

export function PricingSimulator() {
  const [screens, setScreens] = useState(20)
  const [slotSeconds, setSlotSeconds] = useState<number>(15)
  const [zoneId, setZoneId] = useState<ZoneChoiceId>("community")
  const [playsPerDay, setPlaysPerDay] = useState(20)
  const [days, setDays] = useState(14)

  const daysId = useId()
  const screensId = useId()
  const playsId = useId()

  const zone = zoneChoices.find((z) => z.id === zoneId) ?? zoneChoices[0]!

  const result = useMemo(
    () =>
      calculateSimulatorPrice({
        screens,
        slotSeconds,
        zoneMultiplier: zone.multiplier,
        playsPerDay,
        days,
      }),
    [screens, slotSeconds, zone.multiplier, playsPerDay, days],
  )

  const animatedTotal = useAnimatedNumber(result.total)

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:items-start">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <NumberStepper
              id={daysId}
              label="Campaign length (days)"
              value={days}
              min={DAYS_MIN}
              max={DAYS_MAX}
              onChange={setDays}
            />

            <NumberStepper
              id={screensId}
              label="Number of screens"
              value={screens}
              min={SCREENS_MIN}
              max={SCREENS_MAX}
              onChange={setScreens}
              hint="10+ unlocks the 0.9x volume rate, 50+ unlocks 0.8x."
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Ad slot length</legend>
            <div className="grid grid-cols-4 gap-2">
              {slotLengthOptions.map((option) => {
                const active = option.seconds === slotSeconds
                return (
                  <button
                    key={option.seconds}
                    type="button"
                    onClick={() => setSlotSeconds(option.seconds)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-transparent text-foreground hover:bg-muted",
                    )}
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "text-[0.65rem] font-normal tabular-nums",
                        active ? "text-primary-foreground/75" : "text-muted-foreground",
                      )}
                    >
                      {option.multiplier.toFixed(1)}x
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Zone</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {zoneChoices.map((z) => {
                const active = z.id === zoneId
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setZoneId(z.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/[0.06] ring-1 ring-primary"
                        : "border-input bg-transparent hover:bg-muted",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium text-foreground">{z.name}</span>
                      <span className="text-muted-foreground text-xs">{z.hint}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {z.multiplier.toFixed(1)}x
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor={playsId}>Plays per day, per screen</Label>
            <div className="flex items-center gap-3">
              <input
                id={playsId}
                type="range"
                min={PLAYS_MIN}
                max={PLAYS_MAX}
                value={playsPerDay}
                onChange={(e) => setPlaysPerDay(clampInt(Number(e.target.value), PLAYS_MIN, PLAYS_MAX))}
                className="accent-primary h-1.5 w-full"
              />
              <span className="text-foreground w-10 shrink-0 text-right text-sm font-medium tabular-nums">
                {playsPerDay}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">Capped by loop capacity, confirmed at booking.</p>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-24">
        <div
          aria-live="polite"
          className="overflow-hidden rounded-xl border border-border bg-background shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_16px_32px_-18px_rgb(0_0_0_/_0.35)]"
        >
          <div className="px-6 pt-6 sm:px-7 sm:pt-7">
            <p className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-[0.2em]">
              Campaign estimate
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground tabular-nums sm:text-5xl">
              {formatKes(animatedTotal)}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {screens} screen{screens === 1 ? "" : "s"} · {days} day{days === 1 ? "" : "s"} · {playsPerDay} plays/day
            </p>
          </div>

          <dl className="mt-6 space-y-2.5 border-t border-dashed border-border px-6 py-6 font-mono text-[0.8rem] sm:px-7">
            <ReceiptRow label="Base rate" value={formatKesPrecise(BASE_PRICE_PER_PLAY_KES)} />
            <ReceiptRow label={`× Slot length (${slotSeconds}s)`} value={`${result.slotMultiplier.toFixed(1)}x`} />
            <ReceiptRow label={`× Zone (${zone.name})`} value={`${zone.multiplier.toFixed(1)}x`} />
            <ReceiptRow label={`× Volume (${result.volumeTier.label})`} value={`${result.volumeTier.multiplier.toFixed(1)}x`} />

            <div className="border-t border-dashed border-border pt-2.5">
              <ReceiptRow label="Price per play" value={formatKesPrecise(result.pricePerPlay)} strong />
            </div>
            <ReceiptRow label={`× ${playsPerDay} plays/day`} value={formatKes(result.pricePerScreenPerDay)} />
            <ReceiptRow label={`× ${screens} screen${screens === 1 ? "" : "s"}`} value={formatKes(result.totalPerDay)} />
            <ReceiptRow label={`× ${days} day${days === 1 ? "" : "s"}`} value={formatKes(result.total)} />
          </dl>

          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-6 py-4 sm:px-7">
            <span className="text-muted-foreground font-mono text-xs uppercase tracking-[0.15em]">Total</span>
            <span className="text-foreground text-xl font-semibold tabular-nums">{formatKes(result.total)}</span>
          </div>
        </div>

        <Button asChild size="lg" className="mt-4 w-full">
          <Link href="/start-campaign">
            Get this confirmed
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
