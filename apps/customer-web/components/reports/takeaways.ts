import type { NamedValue } from "@workspace/ops-contracts"

/**
 * One-sentence answers for chart cards (`ChartCard takeaway`), so an advertiser gets the point
 * without decoding the plot. Each returns undefined when there is nothing honest to say, and the
 * card then shows the chart alone.
 */

export const pct = (share: number) => `${Math.round(share * 100)}%`

/** "2026-11-07" → "Fri 7 Nov". */
export const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(",", "")

/** The biggest row and its share of the positive total. */
export function leader(rows: NamedValue[]): { name: string; value: number; share: number } | undefined {
  const total = rows.reduce((sum, r) => sum + Math.max(0, r.value), 0)
  const top = rows.reduce<NamedValue | undefined>((best, r) => (!best || r.value > best.value ? r : best), undefined)
  if (!top || total <= 0 || top.value <= 0) return undefined
  return { name: top.name, value: top.value, share: top.value / total }
}

type Point = Record<string, string | number | null>

const numbers = (points: Point[], key: string) =>
  points.flatMap((p) => (typeof p[key] === "number" ? [{ day: String(p.day), value: p[key] as number }] : []))

/** The day with the highest value of `key`. */
export function peak(points: Point[], key: string): { day: string; value: number } | undefined {
  return numbers(points, key).reduce<{ day: string; value: number } | undefined>(
    (best, p) => (!best || p.value > best.value ? p : best),
    undefined,
  )
}

/** The day with the lowest value of `key`, ignoring days with no value. */
export function low(points: Point[], key: string): { day: string; value: number } | undefined {
  return numbers(points, key).reduce<{ day: string; value: number } | undefined>(
    (best, p) => (!best || p.value < best.value ? p : best),
    undefined,
  )
}

export function sum(points: Point[], key: string): number {
  return numbers(points, key).reduce((s, p) => s + p.value, 0)
}

export function average(points: Point[], key: string): number | undefined {
  const values = numbers(points, key)
  return values.length ? values.reduce((s, p) => s + p.value, 0) / values.length : undefined
}

/** The darkest heatmap cell. */
export function topCell(cells: { row: string; column: string; value: number | null }[]) {
  return cells.reduce<{ row: string; column: string; value: number } | undefined>(
    (best, c) => (c.value !== null && c.value > 0 && (!best || c.value > best.value) ? { ...c, value: c.value } : best),
    undefined,
  )
}

/** "up 12% on the period before" / "down 5% …" / "about the same as …"; undefined without a comparison. */
export function versus(current: number, previous: number | undefined): string | undefined {
  if (previous === undefined || previous <= 0) return undefined
  const change = (current - previous) / previous
  if (Math.abs(change) < 0.02) return "about the same as the period before"
  return `${change > 0 ? "up" : "down"} ${pct(Math.abs(change))} on the period before`
}
