import type { DailyPoint } from "./analytics"

/**
 * Daily points → Monday-first weeks for a contributions-style activity grid. A day with no point,
 * or a null value, stays null (no data is not the same as zero). Only the last 53 weeks are kept.
 */
export type WeekGrid = { weeks: { start: string; days: (number | null)[] }[]; max: number }

const DAY_MS = 86_400_000
const MAX_WEEKS = 53
const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
/** Monday = 0 … Sunday = 6. */
const weekday = (ms: number) => (new Date(ms).getUTCDay() + 6) % 7

export function toWeekGrid(points: DailyPoint[], key: string): WeekGrid {
  const values = new Map<string, number>()
  for (const point of points) {
    const value = point[key]
    if (typeof value === "number") values.set(point.day, value)
  }
  const days = points.map((p) => toUtc(p.day)).filter(Number.isFinite)
  if (days.length === 0) return { weeks: [], max: 0 }

  const last = Math.max(...days)
  const firstMonday = Math.min(...days) - weekday(Math.min(...days)) * DAY_MS
  const lastMonday = last - weekday(last) * DAY_MS
  const weeks: WeekGrid["weeks"] = []
  for (let monday = firstMonday; monday <= lastMonday; monday += 7 * DAY_MS) {
    weeks.push({
      start: toIso(monday),
      days: Array.from({ length: 7 }, (_, i) => values.get(toIso(monday + i * DAY_MS)) ?? null),
    })
  }
  const kept = weeks.slice(-MAX_WEEKS)
  const max = Math.max(0, ...kept.flatMap((w) => w.days.filter((d): d is number => d !== null)))
  return { weeks: kept, max }
}
