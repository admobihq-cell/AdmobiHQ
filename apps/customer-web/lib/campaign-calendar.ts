import type { Campaign } from "@/lib/campaigns"

export const FLIGHT_DURATIONS = ["1 day", "1 week", "1 month", "3 months"] as const
export type FlightDuration = (typeof FLIGHT_DURATIONS)[number]

const DURATION_DAYS: Record<FlightDuration, number> = {
  "1 day": 1,
  "1 week": 7,
  "1 month": 30,
  "3 months": 90,
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
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

export function exclusiveEndIso(inclusiveEnd: DayIso): DayIso {
  return toDayIso(addDays(parseDayIso(inclusiveEnd), 1))
}

export function inclusiveEndIso(exclusiveEnd: DayIso): DayIso {
  return toDayIso(addDays(parseDayIso(exclusiveEnd), -1))
}

export function formatDayHeading(iso: DayIso): string {
  return parseDayIso(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export function parseDisplayDates(
  dates: string,
  fallbackYear = new Date().getFullYear(),
): ResolvedFlight | null {
  const trimmed = dates.trim()
  if (!trimmed || /^not scheduled$/i.test(trimmed)) return null
  if (isFlightDuration(trimmed)) return null

  const startsOnly = trimmed.match(
    /^starts\s+([a-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i,
  )
  if (startsOnly) {
    const start = dateFromParts(
      startsOnly[1]!,
      startsOnly[2]!,
      startsOnly[3] ?? fallbackYear,
    )
    if (!start) return null
    const startsOn = toDayIso(start)
    return { startsOn, endsOn: endsOnFromDuration(startsOn, "1 month") }
  }

  const range = trimmed.match(
    /^([a-z]+)\s+(\d{1,2})\s*[–-]\s*([a-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i,
  )
  if (range) {
    const year = Number(range[5] ?? fallbackYear)
    const start = dateFromParts(range[1]!, range[2]!, year)
    let end = dateFromParts(range[3]!, range[4]!, year)
    if (!start || !end) return null
    if (end < start) end = dateFromParts(range[3]!, range[4]!, year + 1)
    if (!end) return null
    return { startsOn: toDayIso(start), endsOn: toDayIso(end) }
  }

  return null
}

export function resolveFlight(
  campaign: Campaign,
  fallbackYear = new Date().getFullYear(),
): ResolvedFlight | null {
  if (campaign.startsOn && campaign.endsOn) {
    return { startsOn: campaign.startsOn, endsOn: campaign.endsOn }
  }
  if (campaign.startsOn) {
    return { startsOn: campaign.startsOn, endsOn: campaign.startsOn }
  }
  return parseDisplayDates(campaign.dates, fallbackYear)
}

function dateFromParts(monthToken: string, dayToken: string, year: string | number): Date | null {
  const month = MONTH_INDEX[monthToken.toLowerCase()]
  const day = Number(dayToken)
  const numericYear = Number(year)
  if (month === undefined || !Number.isFinite(day) || !Number.isFinite(numericYear)) {
    return null
  }
  const date = new Date(numericYear, month, day)
  if (date.getMonth() !== month || date.getDate() !== day) return null
  return date
}
