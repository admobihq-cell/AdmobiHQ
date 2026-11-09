import { nairobiDay } from "@workspace/ops-contracts"

const DAY_MS = 86_400_000

export const FORMAT_LABELS: Record<string, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Taxi-top LED + delivery bike",
}

/** Whole days from `a` to `b`, both `YYYY-MM-DD`. UTC math on the strings, so no tz shift. */
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS)

export type Flight =
  | { kind: "unscheduled" }
  | { kind: "upcoming"; totalDays: number; startsInDays: number }
  | { kind: "running"; totalDays: number; day: number; daysLeft: number; fraction: number }
  | { kind: "ended"; totalDays: number; endedDaysAgo: number }

/**
 * Where today sits in a flight window, by calendar day in Nairobi. This only reads the dates; a
 * campaign that isn't approved is still "upcoming" here, so callers pair it with the status.
 */
export function flightOf(
  startsOn: string | null,
  endsOn: string | null,
  today: string = nairobiDay(new Date()),
): Flight {
  if (!startsOn || !endsOn) return { kind: "unscheduled" }
  const totalDays = daysBetween(startsOn, endsOn) + 1
  if (today < startsOn) return { kind: "upcoming", totalDays, startsInDays: daysBetween(today, startsOn) }
  if (today > endsOn) return { kind: "ended", totalDays, endedDaysAgo: daysBetween(endsOn, today) }
  const day = daysBetween(startsOn, today) + 1
  return { kind: "running", totalDays, day, daysLeft: totalDays - day, fraction: day / totalDays }
}

const sameYear = (day: string) => day.slice(0, 4) === nairobiDay(new Date()).slice(0, 4)

/** "12 Dec", or "12 Dec 2025" outside the current year. */
export function shortDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    ...(sameYear(day) ? {} : { year: "numeric" }),
    timeZone: "UTC",
  })
}

/** An ISO timestamp as "12 Dec", in Nairobi. */
export const shortTimestamp = (iso: string) => shortDate(nairobiDay(new Date(iso)))

export function flightRange(startsOn: string | null, endsOn: string | null): string {
  if (!startsOn || !endsOn) return "Dates not set"
  return `${shortDate(startsOn)} – ${shortDate(endsOn)}`
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** The one-line "where is it" a person asks first: "Day 6 of 14", "Starts in 3 days". */
export function flightLabel(flight: Flight): string {
  switch (flight.kind) {
    case "unscheduled":
      return "Not scheduled"
    case "upcoming":
      return flight.startsInDays === 1 ? "Starts tomorrow" : `Starts in ${plural(flight.startsInDays, "day")}`
    case "running":
      return `Day ${flight.day} of ${flight.totalDays}`
    case "ended":
      return flight.endedDaysAgo === 1 ? "Ended yesterday" : `Ended ${plural(flight.endedDaysAgo, "day")} ago`
  }
}
