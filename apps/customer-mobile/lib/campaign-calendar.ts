// Framework-agnostic flight-window helpers — mirrors
// apps/customer-web/lib/campaign-calendar.ts so web and mobile resolve the same
// dates from the same campaign data.

import type { CampaignDto } from "@workspace/ops-contracts"

export const FLIGHT_DURATIONS = ["1 day", "1 week", "1 month", "3 months"] as const
export type FlightDuration = (typeof FLIGHT_DURATIONS)[number]

const DURATION_DAYS: Record<FlightDuration, number> = {
  "1 day": 1,
  "1 week": 7,
  "1 month": 30,
  "3 months": 90,
}

export type DayIso = string

export type ResolvedFlight = {
  startsOn: DayIso
  endsOn: DayIso
}

export function toDayIso(date: Date): DayIso {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseDayIso(iso: DayIso): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

/** Whole days from `a` to `b` (b - a). Negative when b is before a. */
export function daysBetween(a: DayIso, b: DayIso): number {
  const ms = parseDayIso(b).getTime() - parseDayIso(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function isFlightDuration(value: string): value is FlightDuration {
  return (FLIGHT_DURATIONS as readonly string[]).includes(value)
}

export function daysForDuration(duration: FlightDuration): number {
  return DURATION_DAYS[duration]
}

export function endsOnFromDuration(startsOn: DayIso, duration: FlightDuration): DayIso {
  const days = daysForDuration(duration)
  return toDayIso(addDays(parseDayIso(startsOn), days - 1))
}

export function formatFlightDates(startsOn: DayIso, endsOn: DayIso): string {
  const start = parseDayIso(startsOn)
  const end = parseDayIso(endsOn)
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  if (startsOn === endsOn) return startLabel
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${startLabel} – ${endLabel}`
}

export function formatDayHeading(iso: DayIso): string {
  return parseDayIso(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

/** A campaign's flight window, or null when it isn't scheduled yet.
 *
 * This used to fall back to parsing a human display string ("Jun 1 – Aug 31")
 * because the seeded mock had no date columns. Real campaigns carry
 * starts_on/ends_on, so that whole parser is gone.
 */
export function resolveFlight(campaign: CampaignDto): ResolvedFlight | null {
  if (campaign.starts_on && campaign.ends_on) {
    return { startsOn: campaign.starts_on, endsOn: campaign.ends_on }
  }
  if (campaign.starts_on) {
    return { startsOn: campaign.starts_on, endsOn: campaign.starts_on }
  }
  return null
}
