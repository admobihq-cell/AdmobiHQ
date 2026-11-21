/**
 * Turns sparse per-day rows from SQL into a continuous series for a chart: every day in the
 * window, missing days as 0 (these are money sums, where no rows really does mean zero). Windows
 * longer than MONTHLY_AFTER_DAYS roll up into calendar months ("2026-03") so "All time" stays
 * readable.
 */
export const MONTHLY_AFTER_DAYS = 120
const DAY_MS = 86_400_000

type Row = { day: string } & Record<string, number | string>

export function bucketSeries(
  rows: Row[],
  start: string,
  end: string,
  keys: string[]
): { granularity: "day" | "month"; points: ({ day: string } & Record<string, string | number>)[] } {
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return { granularity: "day", points: [] }

  const monthly = (to - from) / DAY_MS + 1 > MONTHLY_AFTER_DAYS
  const keyOf = (iso: string) => (monthly ? iso.slice(0, 7) : iso)
  const buckets = new Map<string, Record<string, number>>()
  for (let t = from; t <= to; t += DAY_MS) {
    const key = keyOf(new Date(t).toISOString().slice(0, 10))
    if (!buckets.has(key)) buckets.set(key, Object.fromEntries(keys.map((k) => [k, 0])))
  }
  for (const row of rows) {
    const bucket = buckets.get(keyOf(row.day))
    if (!bucket) continue
    for (const k of keys) bucket[k] = (bucket[k] ?? 0) + (Number(row[k]) || 0)
  }
  return {
    granularity: monthly ? "month" : "day",
    points: [...buckets].map(([day, values]) => ({ day, ...values })),
  }
}
