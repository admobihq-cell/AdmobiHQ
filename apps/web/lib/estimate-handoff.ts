import type { CampaignLeadInput } from "./validation/lead-schemas"

/** A /pricing simulator estimate, carried to /start-campaign in the query string. */
export type Estimate = {
  format: "taxi_top" | "delivery_bike"
  days: number
  total: number
  /** One-line breakdown that lands in the brief, so ops sees exactly what was quoted. */
  summary: string
}

export function estimateHref(e: Estimate) {
  const q = new URLSearchParams({
    format: e.format,
    days: String(e.days),
    total: String(Math.round(e.total)),
    estimate: e.summary,
  })
  return `/start-campaign?${q}`
}

/** Maps an estimate back onto the campaign brief's fields; anything missing or malformed is skipped. */
export function readEstimate(search: string) {
  const q = new URLSearchParams(search)
  const out: Partial<Pick<CampaignLeadInput, "adFormats" | "duration" | "budget" | "brief">> = {}

  const format = q.get("format")
  if (format === "taxi_top" || format === "delivery_bike") out.adFormats = [format]

  const days = Number(q.get("days"))
  if (days > 0) {
    out.duration =
      days <= 1 ? "1_day" : days <= 7 ? "1_week" : days <= 14 ? "2_weeks" : days <= 31 ? "1_month" : "ongoing"
  }

  const total = Number(q.get("total"))
  if (total > 0) {
    out.budget =
      total < 50_000 ? "under_50k" : total <= 150_000 ? "50k_150k" : total <= 500_000 ? "150k_500k" : "500k_plus"
  }

  const summary = q.get("estimate")?.trim()
  if (summary) out.brief = summary.slice(0, 1000)

  return out
}
