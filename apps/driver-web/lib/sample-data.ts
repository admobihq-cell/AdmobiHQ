import { delta, resolveReportRange, type Delta, type NamedValue } from "@workspace/ops-contracts"

/**
 * Illustrative screen telemetry for the dashboards: screen-on hours, ad plays, distance and
 * areas. Nothing records these yet, so every figure built from here is tagged "Sample" where
 * it is shown. Seeded by calendar day, so the same day always draws the same numbers (server
 * and client agree, and switching ranges back and forth is stable). Replace with the real
 * telemetry endpoint when screens report.
 */

export type SampleRange = { range?: string; from?: string; to?: string }

/** `logged`: signed in and on shift. `driven`: moving. `hours`: roof screen on. logged >= driven >= hours. */
export type SampleDay = {
  day: string
  logged: number
  driven: number
  hours: number
  plays: number
  km: number
  area: string | null
}

export const SAMPLE_AREAS = ["Nairobi CBD", "Westlands", "Kilimani", "Upper Hill", "Mombasa Rd", "Thika Rd"] as const
const AREA_WEIGHT = [0.3, 0.22, 0.16, 0.13, 0.11, 0.08]

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
export const TIME_BANDS = ["6–9 am", "9 am–noon", "noon–3 pm", "3–6 pm", "6–9 pm", "9 pm–midnight"] as const
const BAND_WEIGHT = [1.25, 0.8, 0.7, 0.95, 1.35, 0.6]

/** Longest window the sample draws, so "All" stays a readable chart. */
const MAX_DAYS = 90
const DAY_MS = 86_400_000

/** A stable 0–1 number for (day, salt). FNV-1a into a small xorshift. */
function rand(day: string, salt: number): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619)
  h ^= h << 13
  h ^= h >>> 17
  h ^= h << 5
  return (h >>> 0) / 4294967296
}

const round1 = (n: number) => Math.round(n * 10) / 10
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const weekdayIndex = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7

function pickArea(day: string): string {
  const r = rand(day, 4)
  let acc = 0
  for (let i = 0; i < SAMPLE_AREAS.length; i++) {
    acc += AREA_WEIGHT[i]!
    if (r < acc) return SAMPLE_AREAS[i]!
  }
  return SAMPLE_AREAS[0]
}

export function sampleDay(day: string): SampleDay {
  const weekday = weekdayIndex(day)
  // About one day in eight off, more often on Sundays.
  const off = rand(day, 1) < (weekday === 6 ? 0.45 : 0.1)
  if (off) return { day, logged: 0, driven: 0, hours: 0, plays: 0, km: 0, area: null }
  const hours = round1((weekday === 6 ? 3.5 : 5.5) + rand(day, 2) * 5.5)
  const driven = round1(hours + 0.2 + rand(day, 7) * 0.8)
  return {
    day,
    logged: round1(driven + 0.4 + rand(day, 8) * 1.2),
    driven,
    hours,
    plays: Math.round(hours * (34 + rand(day, 3) * 12)),
    km: Math.round(55 + hours * 11 + rand(day, 5) * 40),
    area: pickArea(day),
  }
}

function daysBetween(start: string, end: string): string[] {
  const endMs = Date.parse(`${end}T00:00:00Z`)
  const startMs = Math.max(Date.parse(`${start}T00:00:00Z`), endMs - (MAX_DAYS - 1) * DAY_MS)
  const out: string[] = []
  for (let ms = startMs; ms <= endMs; ms += DAY_MS) out.push(isoDay(ms))
  return out
}

type Totals = { logged: number; driven: number; hours: number; plays: number; km: number; activeDays: number }

function totals(days: SampleDay[]): Totals {
  return days.reduce(
    (t, d) => ({
      logged: round1(t.logged + d.logged),
      driven: round1(t.driven + d.driven),
      hours: round1(t.hours + d.hours),
      plays: t.plays + d.plays,
      km: t.km + d.km,
      activeDays: t.activeDays + (d.hours > 0 ? 1 : 0),
    }),
    { logged: 0, driven: 0, hours: 0, plays: 0, km: 0, activeDays: 0 },
  )
}

export type SampleTelemetry = {
  days: SampleDay[]
  totals: Totals
  deltas: { hours: Delta; plays: Delta; km: Delta }
  /** Hours by area, largest first. */
  areas: NamedValue[]
  /** Average plays per active day, weekday × time band. */
  heat: { row: string; column: string; value: number }[]
}

export function sampleTelemetry(range: SampleRange, today = new Date()): SampleTelemetry {
  const window = resolveReportRange(range, today)
  const days = daysBetween(window.start, window.end).map(sampleDay)
  const span = days.length
  const firstMs = Date.parse(`${days[0]!.day}T00:00:00Z`)
  const previous = daysBetween(isoDay(firstMs - span * DAY_MS), isoDay(firstMs - DAY_MS)).map(sampleDay)
  // "All" has nothing before it to compare against.
  const hasPrevious = window.previous !== null
  const now = totals(days)
  const before = hasPrevious ? totals(previous) : null

  const byArea = new Map<string, number>()
  for (const d of days) if (d.area) byArea.set(d.area, round1((byArea.get(d.area) ?? 0) + d.hours))
  const areas = [...byArea].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const heat = WEEKDAYS.flatMap((row, w) => {
    const active = days.filter((d) => d.hours > 0 && weekdayIndex(d.day) === w)
    const avgPlays = active.length ? active.reduce((s, d) => s + d.plays, 0) / active.length : 0
    const share = BAND_WEIGHT.reduce((s, b) => s + b, 0)
    return TIME_BANDS.map((column, b) => ({
      row,
      column,
      value: Math.round((avgPlays * BAND_WEIGHT[b]!) / share * (0.85 + rand(`${row}${column}`, 6) * 0.3)),
    }))
  })

  return {
    days,
    totals: now,
    deltas: {
      hours: delta(now.hours, before?.hours ?? null),
      plays: delta(now.plays, before?.plays ?? null),
      km: delta(now.km, before?.km ?? null),
    },
    areas,
    heat,
  }
}

export const formatHours = (h: number) => `${h.toLocaleString("en-KE", { maximumFractionDigits: 1 })} h`
export const formatKm = (km: number) => `${km.toLocaleString("en-KE")} km`

/** The busiest weekday × time-band slots, most plays first, in words a driver can act on. */
export function bestTimes(heat: SampleTelemetry["heat"], count = 3) {
  return [...heat]
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
    .map((c) => ({ day: c.row, band: c.column, plays: c.value }))
}

/** "2026-11-07" → "Sat 7 Nov". */
export const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(",", "")
