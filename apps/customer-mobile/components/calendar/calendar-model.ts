// Pure layout helpers for the flight calendar — no React, no gestures.

import {
  addDays,
  daysBetween,
  parseDayIso,
  toDayIso,
  type DayIso,
} from "@/lib/campaign-calendar"

export type CalendarViewId = "month" | "week" | "day" | "agenda"

export const CALENDAR_VIEWS: { id: CalendarViewId; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "agenda", label: "Agenda" },
]

/** Monday-first weekday index (0 = Mon … 6 = Sun). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function startOfWeek(date: Date): Date {
  return addDays(date, -mondayIndex(date))
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/** 6 weeks × 7 days of ISO strings covering the month `anchor` falls in. */
export function buildMonthMatrix(anchor: Date): DayIso[][] {
  const gridStart = startOfWeek(startOfMonth(anchor))
  const weeks: DayIso[][] = []
  for (let w = 0; w < 6; w += 1) {
    const week: DayIso[] = []
    for (let d = 0; d < 7; d += 1) {
      week.push(toDayIso(addDays(gridStart, w * 7 + d)))
    }
    weeks.push(week)
  }
  return weeks
}

/** 7 ISO strings for the week `anchor` falls in. */
export function buildWeek(anchor: Date): DayIso[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => toDayIso(addDays(start, i)))
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function monthTitle(anchor: Date): string {
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function weekTitle(days: DayIso[]): string {
  const first = parseDayIso(days[0]!)
  const last = parseDayIso(days[6]!)
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  const sameMonth = first.getMonth() === last.getMonth()
  const left = first.toLocaleDateString("en-US", opts)
  const right = last.toLocaleDateString(
    "en-US",
    sameMonth ? { day: "numeric" } : opts,
  )
  return `${left} – ${right}, ${last.getFullYear()}`
}

export function dayTitle(anchor: Date): string {
  return anchor.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export type Flight = {
  id: string
  name: string
  status: string
  market: string
  startsOn: DayIso
  endsOn: DayIso
}

export type FlightSegment = {
  flight: Flight
  lane: number
  /** 0-based column within the week row where the bar starts. */
  colStart: number
  /** Number of day columns the bar spans in this week row. */
  colSpan: number
  continuesLeft: boolean
  continuesRight: boolean
}

/**
 * Assign flights overlapping a week row to stacked lanes and clip them to the
 * visible 7 columns. Greedy first-fit by start date, longest first.
 */
export function layoutWeek(week: DayIso[], flights: Flight[]): FlightSegment[] {
  const weekStart = week[0]!
  const weekEnd = week[6]!

  const visible = flights
    .filter((f) => f.startsOn <= weekEnd && f.endsOn >= weekStart)
    .sort((a, b) => {
      if (a.startsOn !== b.startsOn) return a.startsOn < b.startsOn ? -1 : 1
      const spanA = daysBetween(a.startsOn, a.endsOn)
      const spanB = daysBetween(b.startsOn, b.endsOn)
      return spanB - spanA
    })

  const laneEnds: number[] = [] // last occupied column per lane
  const segments: FlightSegment[] = []

  for (const flight of visible) {
    const colStart = Math.max(0, daysBetween(weekStart, flight.startsOn))
    const colEnd = Math.min(6, daysBetween(weekStart, flight.endsOn))
    const colSpan = Math.max(1, colEnd - colStart + 1)

    let lane = laneEnds.findIndex((end) => end < colStart)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(colEnd)
    } else {
      laneEnds[lane] = colEnd
    }

    segments.push({
      flight,
      lane,
      colStart,
      colSpan,
      continuesLeft: flight.startsOn < weekStart,
      continuesRight: flight.endsOn > weekEnd,
    })
  }

  return segments
}

export function maxLane(segments: FlightSegment[]): number {
  return segments.reduce((max, s) => Math.max(max, s.lane), -1)
}

export function isToday(iso: DayIso): boolean {
  return iso === toDayIso(new Date())
}

export function inMonth(iso: DayIso, anchor: Date): boolean {
  return parseDayIso(iso).getMonth() === anchor.getMonth()
}

export function flightsOnDay(iso: DayIso, flights: Flight[]): Flight[] {
  return flights.filter((f) => iso >= f.startsOn && iso <= f.endsOn)
}
