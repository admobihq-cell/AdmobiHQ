import { unstable_cache } from "next/cache"

import {
  DAYPART_LABELS,
  campaignHealth,
  delta,
  measurementLevel,
  nairobiDay,
  rate,
  resolveReportRange,
  type DailyPoint,
  type DateRangeKey,
  type Daypart,
  type Delta,
  type HealthResult,
  type NamedValue,
} from "@workspace/ops-contracts"

import { getPgPool } from "@/lib/pg"

/**
 * Ops campaign dashboards, raw SQL across every org. The caller has already checked the
 * `campaigns` permission. Budget is money, so it is read only when `includeMoney` is true and is
 * `null` otherwise: the query itself skips it, not just the screen. The two variants are cached
 * under separate keys, so a cached money payload can't reach a viewer without `finances`.
 *
 * "Live" mirrors campaignFlightPhase: approved, started, and not yet past its end date.
 */

const NAIROBI = (col: string) => `(${col} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date`
const DAY_MS = 86_400_000
const roundTo = (value: number, places = 1) => Math.round(value * 10 ** places) / 10 ** places
const num = (value: unknown) => (value == null ? 0 : Number(value))
const nullable = (value: unknown) => (value == null ? null : Number(value))

async function rows<T extends object>(sql: string, params: unknown[]): Promise<T[]> {
  return (await getPgPool().query<T>(sql, params)).rows
}

function eachDay(start: string, end: string): string[] {
  const days: string[] = []
  for (let ms = Date.parse(start); ms <= Date.parse(end); ms += DAY_MS) days.push(new Date(ms).toISOString().slice(0, 10))
  return days
}

const windowOf = (range: DateRangeKey) => resolveReportRange({ range }, new Date())

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export type ReviewQueueRow = {
  id: number
  name: string
  orgName: string
  submittedAt: string
  waitingHours: number
  budgetKes: number | null
}

export type PipelineDto = {
  window: { start: string; end: string }
  includeMoney: boolean
  live: number
  inReview: number
  /** Approved ÷ (approved + rejected) among reviews in the period. Changes requested are left out. */
  approvalRate: number | null
  avgReviewHours: number | null
  /** Budget of campaigns approved in the period; null without `finances`. */
  bookedKes: Delta | null
  funnel: { label: string; value: number }[]
  trend: DailyPoint[]
  queue: ReviewQueueRow[]
}

export async function queryPipeline(range: DateRangeKey, includeMoney: boolean): Promise<PipelineDto> {
  const w = windowOf(range)
  const today = nairobiDay(new Date())
  const reviewedIn = (alias: string) => `${NAIROBI(`${alias}.reviewed_at`)} BETWEEN $1::date AND $2::date`

  const [counts, reviews, booked, prevBooked, cohort, submittedDays, approvedDays, queue] = await Promise.all([
    rows<{ live: number; in_review: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'approved' AND starts_on <= $1::date AND ends_on >= $1::date)::int AS live,
              COUNT(*) FILTER (WHERE status = 'submitted')::int AS in_review
       FROM campaigns`,
      [today]
    ),
    rows<{ approved: number; rejected: number; hours: number | null }>(
      `SELECT COUNT(*) FILTER (WHERE c.status = 'approved')::int AS approved,
              COUNT(*) FILTER (WHERE c.status = 'rejected')::int AS rejected,
              AVG(EXTRACT(EPOCH FROM (c.reviewed_at - c.submitted_at)) / 3600)::float8 AS hours
       FROM campaigns c WHERE c.reviewed_at IS NOT NULL AND c.submitted_at IS NOT NULL AND ${reviewedIn("c")}`,
      [w.start, w.end]
    ),
    includeMoney ? bookedBetween(w.start, w.end) : Promise.resolve(null),
    includeMoney && w.previous ? bookedBetween(w.previous.start, w.previous.end) : Promise.resolve(null),
    rows<{ submitted: number; reviewed: number; approved: number }>(
      `SELECT COUNT(*)::int AS submitted,
              COUNT(*) FILTER (WHERE c.reviewed_at IS NOT NULL)::int AS reviewed,
              COUNT(*) FILTER (WHERE c.status = 'approved')::int AS approved
       FROM campaigns c WHERE c.submitted_at IS NOT NULL AND ${NAIROBI("c.submitted_at")} BETWEEN $1::date AND $2::date`,
      [w.start, w.end]
    ),
    rows<{ day: string; n: number }>(
      `SELECT ${NAIROBI("c.submitted_at")}::text AS day, COUNT(*)::int AS n FROM campaigns c
       WHERE c.submitted_at IS NOT NULL AND ${NAIROBI("c.submitted_at")} BETWEEN $1::date AND $2::date GROUP BY 1`,
      [w.start, w.end]
    ),
    rows<{ day: string; n: number }>(
      `SELECT ${NAIROBI("c.reviewed_at")}::text AS day, COUNT(*)::int AS n FROM campaigns c
       WHERE c.status = 'approved' AND c.reviewed_at IS NOT NULL AND ${reviewedIn("c")} GROUP BY 1`,
      [w.start, w.end]
    ),
    rows<{ id: number; name: string; org_name: string | null; submitted_at: Date; hours: number; budget: number | null }>(
      `SELECT c.id, c.name, o.name AS org_name, c.submitted_at,
              (EXTRACT(EPOCH FROM (now() AT TIME ZONE 'UTC' - c.submitted_at)) / 3600)::float8 AS hours,
              ${includeMoney ? "c.budget_kes::float8" : "NULL::float8"} AS budget
       FROM campaigns c LEFT JOIN advertiser_orgs o ON o.id = c.org_id
       WHERE c.status = 'submitted' AND c.submitted_at IS NOT NULL
       ORDER BY c.submitted_at ASC LIMIT 20`,
      []
    ),
  ])

  const r = reviews[0]
  const co = cohort[0]
  const start = range === "all" ? ([...submittedDays, ...approvedDays].map((d) => d.day).sort()[0] ?? w.end) : w.start
  const sub = new Map(submittedDays.map((d) => [d.day, num(d.n)]))
  const app = new Map(approvedDays.map((d) => [d.day, num(d.n)]))

  return {
    window: { start, end: w.end },
    includeMoney,
    live: num(counts[0]?.live),
    inReview: num(counts[0]?.in_review),
    approvalRate: rate(num(r?.approved), num(r?.approved) + num(r?.rejected) || null),
    avgReviewHours: r?.hours == null ? null : roundTo(Number(r.hours)),
    bookedKes: includeMoney ? delta(booked ?? 0, w.previous ? (prevBooked ?? 0) : null) : null,
    funnel: [
      { label: "Submitted", value: num(co?.submitted) },
      { label: "Reviewed", value: num(co?.reviewed) },
      { label: "Approved", value: num(co?.approved) },
    ],
    trend: eachDay(start, w.end).map((day) => ({ day, submitted: sub.get(day) ?? 0, approved: app.get(day) ?? 0 })),
    queue: queue.map((q) => ({
      id: q.id,
      name: q.name,
      orgName: q.org_name ?? "Deleted organization",
      submittedAt: new Date(q.submitted_at).toISOString(),
      waitingHours: roundTo(num(q.hours)),
      budgetKes: includeMoney ? nullable(q.budget) : null,
    })),
  }
}

async function bookedBetween(start: string, end: string): Promise<number> {
  const [row] = await rows<{ total: number }>(
    `SELECT COALESCE(SUM(c.budget_kes), 0)::float8 AS total FROM campaigns c
     WHERE c.status = 'approved' AND c.reviewed_at IS NOT NULL
       AND ${NAIROBI("c.reviewed_at")} BETWEEN $1::date AND $2::date`,
    [start, end]
  )
  return roundTo(num(row?.total), 2)
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export type CampaignHealthRow = {
  id: number
  name: string
  orgId: number | null
  orgName: string
  /** The advertiser contact on the campaign: customer names live in a separate identity provider. */
  contact: string | null
  market: string | null
  phase: string
  endsOn: string | null
  deliveryRate: number | null
  impressionsLikely: number | null
  health: HealthResult
}

export type DeliveryDto = {
  window: { start: string; end: string }
  measurementLevel: ReturnType<typeof measurementLevel>
  hasRows: boolean
  networkRate: number | null
  scheduled: number
  delivered: number
  byMarket: NamedValue[]
  missedByDaypart: NamedValue[]
  rows: CampaignHealthRow[]
}

export async function queryDelivery(range: DateRangeKey): Promise<DeliveryDto> {
  const w = windowOf(range)
  const today = nairobiDay(new Date())
  const inRange = `s.day BETWEEN $1::date AND $2::date`

  const [totals, byMarket, byDaypart, sources, camps] = await Promise.all([
    rows<{ scheduled: number; net: number; n: number }>(
      `SELECT COALESCE(SUM(s.plays_scheduled), 0)::float8 AS scheduled,
              COALESCE(SUM(s.plays_delivered - s.plays_over), 0)::float8 AS net, COUNT(*)::int AS n
       FROM campaign_daily_stats s WHERE ${inRange}`,
      [w.start, w.end]
    ),
    rows<{ market: string; net: number }>(
      `SELECT s.market, COALESCE(SUM(s.plays_delivered - s.plays_over), 0)::float8 AS net
       FROM campaign_daily_stats s WHERE ${inRange} GROUP BY 1 ORDER BY 2 DESC`,
      [w.start, w.end]
    ),
    rows<{ daypart: string; missed: number }>(
      `SELECT s.daypart, COALESCE(SUM(s.plays_missed), 0)::float8 AS missed
       FROM campaign_daily_stats s WHERE ${inRange} GROUP BY 1 ORDER BY 2 DESC`,
      [w.start, w.end]
    ),
    rows<{ source: string }>(`SELECT DISTINCT s.source FROM campaign_daily_stats s WHERE ${inRange}`, [w.start, w.end]),
    rows<{
      id: number; name: string; org_id: number | null; org_name: string | null; contact: string | null; market: string | null
      status: string; starts_on: string | null; ends_on: string | null; has_creative: boolean
      life_sched: number; life_net: number; likely: number | null
    }>(
      `SELECT c.id, c.name, c.org_id, o.name AS org_name, COALESCE(c.contact_name, c.contact_email) AS contact, c.market, c.status,
              c.starts_on::text AS starts_on, c.ends_on::text AS ends_on,
              EXISTS (SELECT 1 FROM campaign_creatives cc WHERE cc.campaign_id = c.id) AS has_creative,
              COALESCE(l.sched, 0)::float8 AS life_sched, COALESCE(l.net, 0)::float8 AS life_net, r.likely::float8 AS likely
       FROM campaigns c
       LEFT JOIN advertiser_orgs o ON o.id = c.org_id
       LEFT JOIN (SELECT campaign_id, SUM(plays_scheduled) AS sched, SUM(plays_delivered - plays_over) AS net
                  FROM campaign_daily_stats WHERE day <= $3::date GROUP BY campaign_id) l ON l.campaign_id = c.id
       LEFT JOIN (SELECT campaign_id, SUM(impressions_likely) AS likely
                  FROM campaign_daily_stats s WHERE ${inRange} GROUP BY campaign_id) r ON r.campaign_id = c.id
       WHERE c.status NOT IN ('draft', 'cancelled')
       ORDER BY c.starts_on DESC NULLS LAST, c.id DESC LIMIT 200`,
      [w.start, w.end, today]
    ),
  ])

  const t = totals[0]
  const phaseOf = (c: (typeof camps)[number]) =>
    c.status !== "approved" || !c.starts_on || !c.ends_on ? "unscheduled" : today < c.starts_on ? "scheduled" : today > c.ends_on ? "completed" : "live"

  return {
    window: { start: w.start, end: w.end },
    measurementLevel: measurementLevel(sources.map((s) => s.source)),
    hasRows: num(t?.n) > 0,
    networkRate: rate(num(t?.net), num(t?.scheduled) || null),
    scheduled: num(t?.scheduled),
    delivered: num(t?.net),
    byMarket: byMarket.map((m) => ({ name: m.market, value: num(m.net) })).filter((m) => m.value > 0),
    missedByDaypart: byDaypart.map((d) => ({ name: DAYPART_LABELS[d.daypart as Daypart] ?? d.daypart, value: num(d.missed) })),
    rows: camps.map((c): CampaignHealthRow => {
      const lifeRate = rate(num(c.life_net), num(c.life_sched) || null)
      return {
        id: c.id,
        name: c.name,
        orgId: c.org_id,
        orgName: c.org_name ?? "Deleted organization",
        contact: c.contact,
        market: c.market,
        phase: phaseOf(c),
        endsOn: c.ends_on,
        deliveryRate: lifeRate,
        impressionsLikely: nullable(c.likely),
        health: campaignHealth({
          status: c.status,
          startsOn: c.starts_on,
          endsOn: c.ends_on,
          today,
          hasCreative: c.has_creative,
          deliveryRate: lifeRate,
          daysIntoFlight: c.starts_on ? Math.max(0, Math.round((Date.parse(today) - Date.parse(c.starts_on)) / DAY_MS)) : 0,
        }),
      }
    }),
  }
}

// ---------------------------------------------------------------------------
// Inventory mix
// ---------------------------------------------------------------------------

export type InventoryDto = {
  window: { start: string; end: string }
  includeMoney: boolean
  /** Budget of live and scheduled campaigns by format; null without `finances`. */
  budgetByFormat: NamedValue[] | null
  marketByDaypart: { market: string; daypart: string; value: number | null }[]
  impressionsByMarket: NamedValue[]
  endingSoon: { id: number; name: string; orgName: string; endsOn: string; daysLeft: number; deliveryRate: number | null }[]
}

export async function queryInventory(range: DateRangeKey, includeMoney: boolean): Promise<InventoryDto> {
  const w = windowOf(range)
  const today = nairobiDay(new Date())
  const [formats, heat, ending] = await Promise.all([
    includeMoney
      ? rows<{ format: string; total: number }>(
          `SELECT c.format, COALESCE(SUM(c.budget_kes), 0)::float8 AS total FROM campaigns c
           WHERE c.status = 'approved' AND c.ends_on >= $1::date GROUP BY 1 ORDER BY 2 DESC`,
          [today]
        )
      : Promise.resolve(null),
    rows<{ market: string; daypart: string; likely: number | null }>(
      `SELECT s.market, s.daypart, SUM(s.impressions_likely)::float8 AS likely
       FROM campaign_daily_stats s WHERE s.day BETWEEN $1::date AND $2::date GROUP BY 1, 2`,
      [w.start, w.end]
    ),
    rows<{ id: number; name: string; org_name: string | null; ends_on: string; days_left: number; sched: number; net: number }>(
      `SELECT c.id, c.name, o.name AS org_name, c.ends_on::text AS ends_on, (c.ends_on - $1::date)::int AS days_left,
              COALESCE(l.sched, 0)::float8 AS sched, COALESCE(l.net, 0)::float8 AS net
       FROM campaigns c LEFT JOIN advertiser_orgs o ON o.id = c.org_id
       LEFT JOIN (SELECT campaign_id, SUM(plays_scheduled) AS sched, SUM(plays_delivered - plays_over) AS net
                  FROM campaign_daily_stats WHERE day <= $1::date GROUP BY campaign_id) l ON l.campaign_id = c.id
       WHERE c.status = 'approved' AND c.starts_on <= $1::date AND c.ends_on BETWEEN $1::date AND $1::date + 14
       ORDER BY c.ends_on ASC, c.id LIMIT 50`,
      [today]
    ),
  ])

  const byMarket = new Map<string, number>()
  for (const h of heat) if (h.likely != null) byMarket.set(h.market, (byMarket.get(h.market) ?? 0) + Number(h.likely))

  return {
    window: { start: w.start, end: w.end },
    includeMoney,
    budgetByFormat: formats ? formats.map((f) => ({ name: f.format, value: roundTo(num(f.total), 2) })) : null,
    marketByDaypart: heat.map((h) => ({ market: h.market, daypart: DAYPART_LABELS[h.daypart as Daypart] ?? h.daypart, value: nullable(h.likely) })),
    impressionsByMarket: [...byMarket].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    endingSoon: ending.map((e) => ({
      id: e.id,
      name: e.name,
      orgName: e.org_name ?? "Deleted organization",
      endsOn: e.ends_on,
      daysLeft: num(e.days_left),
      deliveryRate: rate(num(e.net), num(e.sched) || null),
    })),
  }
}

// ---------------------------------------------------------------------------
// Cached entry points. The money variants get their own keys.
// ---------------------------------------------------------------------------

const CACHE = { revalidate: 300 }
const variant = (includeMoney: boolean) => (includeMoney ? "money" : "no-money")

export const getPipeline = (range: DateRangeKey, includeMoney: boolean) =>
  unstable_cache(() => queryPipeline(range, includeMoney), ["ops-campaigns-pipeline", range, variant(includeMoney)], CACHE)()
export const getDelivery = (range: DateRangeKey) =>
  unstable_cache(() => queryDelivery(range), ["ops-campaigns-delivery", range], CACHE)()
export const getInventory = (range: DateRangeKey, includeMoney: boolean) =>
  unstable_cache(() => queryInventory(range, includeMoney), ["ops-campaigns-inventory", range, variant(includeMoney)], CACHE)()
