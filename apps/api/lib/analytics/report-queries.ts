import { Prisma } from "@prisma/client"

import {
  ALL_TIME_START,
  DAYPART_LABELS,
  ENDING_SOON_DAYS,
  campaignFlightPhase,
  campaignHealth,
  costPerThousand,
  delta,
  foldOther,
  frequency,
  measurementLevel,
  nairobiDay,
  rate,
  type CampaignReportDto,
  type CreativeRotationRowDto,
  type DailyPoint,
  type Daypart,
  type HeatCell,
  type ImpressionRange,
  type NamedValue,
  type ReportAudienceDto,
  type ReportCampaignRowDto,
  type ReportDeliveryDto,
  type ReportOverviewDto,
  type ReportRange,
  type ReportSpendDto,
} from "@workspace/ops-contracts"

import { LEDGER_DAY, ledgerInRange } from "@/lib/analytics/finance-queries"
import type { ProofOfPlayStat } from "@/lib/campaigns/campaign-statement"
import { prisma } from "@/lib/prisma"

/**
 * Org-scoped delivery queries behind /v1/customer/reports/*.
 *
 * Rules every query here follows:
 * - Scoped by `campaigns.org_id`, never by an id the caller sends.
 * - Spend comes from the wallet ledger, never from the stats tables, and cost per 1,000 leaves
 *   `tax` rows out.
 * - Impressions stay null when no row carries an estimate. A total of nothing is not 0.
 * - Reach is the latest row of one campaign. It is never summed.
 * - Delivery rate is (delivered - over) / scheduled: over-delivery can't hide a missed spot.
 * - Money reaches the response only through `permissionGated` and `spendGated`, so a new field
 *   can't skip the `billing:read` check.
 */

export type ReportFilters = {
  campaignId?: number
  market?: string
  format?: string
  daypart?: string
}

export type ReportScope = {
  orgId: number
  /** The caller holds `billing:read`. */
  canSeeMoney: boolean
  range: ReportRange
  filters: ReportFilters
  today?: Date
}

type Window = { start: string; end: string }

const DAY_MS = 86_400_000
const roundTo = (value: number, places = 2) => {
  const f = 10 ** places
  return Math.round(value * f) / f
}
const num = (value: unknown) => (value == null ? 0 : Number(value))
const nullable = (value: unknown) => (value == null ? null : Number(value))
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS)

function eachDay(w: Window): string[] {
  const days: string[] = []
  for (let ms = Date.parse(w.start); ms <= Date.parse(w.end); ms += DAY_MS) {
    days.push(new Date(ms).toISOString().slice(0, 10))
  }
  return days
}

// ---------------------------------------------------------------------------
// Money gating
// ---------------------------------------------------------------------------

/** Values that need only the permission: budgets. */
const permissionGated = <T>(scope: ReportScope, value: T): T | null => (scope.canSeeMoney ? value : null)

/**
 * Values derived from spend. Ledger spend is held per campaign, so under a market, daypart or
 * format filter it can't be honoured, and the answer is null rather than the unfiltered figure.
 */
const spendComparable = (f: ReportFilters) => !f.market && !f.daypart && !f.format
const canSeeSpend = (scope: ReportScope) => scope.canSeeMoney && spendComparable(scope.filters)
const spendGated = <T>(scope: ReportScope, value: T): T | null => (canSeeSpend(scope) ? value : null)

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

/** "All" starts at the first day with data, so a chart doesn't fill years of empty days. */
async function windows(scope: ReportScope): Promise<{ current: Window; previous: Window | null }> {
  const { range } = scope
  if (range.start !== ALL_TIME_START) return { current: { start: range.start, end: range.end }, previous: range.previous }

  const [row] = await prisma.$queryRaw<{ first: string | null }[]>`
    SELECT MIN(s.day)::text AS first
    FROM campaign_daily_stats s JOIN campaigns c ON c.id = s.campaign_id
    WHERE c.org_id = ${scope.orgId}`
  const first = row?.first && row.first <= range.end ? row.first : range.end
  return { current: { start: first, end: range.end }, previous: null }
}

// ---------------------------------------------------------------------------
// Stats aggregates
// ---------------------------------------------------------------------------

function statsBase(scope: ReportScope, w: Window): Prisma.Sql {
  const f = scope.filters
  return Prisma.sql`
    FROM campaign_daily_stats s JOIN campaigns c ON c.id = s.campaign_id
    WHERE c.org_id = ${scope.orgId} AND s.day BETWEEN ${w.start}::date AND ${w.end}::date
      ${f.campaignId ? Prisma.sql`AND s.campaign_id = ${f.campaignId}` : Prisma.empty}
      ${f.market ? Prisma.sql`AND s.market = ${f.market}` : Prisma.empty}
      ${f.format ? Prisma.sql`AND s.format = ${f.format}` : Prisma.empty}
      ${f.daypart ? Prisma.sql`AND s.daypart = ${f.daypart}` : Prisma.empty}`
}

const AGG = Prisma.sql`
  COALESCE(SUM(s.plays_scheduled), 0)::float8 AS scheduled,
  COALESCE(SUM(s.plays_delivered), 0)::float8 AS delivered,
  COALESCE(SUM(s.plays_missed), 0)::float8 AS missed,
  COALESCE(SUM(s.plays_over), 0)::float8 AS over,
  COALESCE(SUM(s.vehicle_hours), 0)::float8 AS vehicle_hours,
  COALESCE(SUM(s.distance_km), 0)::float8 AS distance_km,
  SUM(s.impressions_low)::float8 AS low,
  SUM(s.impressions_likely)::float8 AS likely,
  SUM(s.impressions_high)::float8 AS high,
  COUNT(*)::int AS n`

type RawAgg = {
  scheduled: number
  delivered: number
  missed: number
  over: number
  vehicle_hours: number
  distance_km: number
  low: number | null
  likely: number | null
  high: number | null
  n: number
}

type Agg = {
  scheduled: number
  delivered: number
  missed: number
  over: number
  vehicleHours: number
  distanceKm: number
  low: number | null
  likely: number | null
  high: number | null
  rows: number
}

const EMPTY_AGG: Agg = {
  scheduled: 0, delivered: 0, missed: 0, over: 0, vehicleHours: 0, distanceKm: 0,
  low: null, likely: null, high: null, rows: 0,
}

function toAgg(r: RawAgg | undefined): Agg {
  if (!r) return EMPTY_AGG
  return {
    scheduled: num(r.scheduled),
    delivered: num(r.delivered),
    missed: num(r.missed),
    over: num(r.over),
    vehicleHours: roundTo(num(r.vehicle_hours)),
    distanceKm: roundTo(num(r.distance_km)),
    low: nullable(r.low),
    likely: nullable(r.likely),
    high: nullable(r.high),
    rows: num(r.n),
  }
}

const netDelivered = (a: Agg) => a.delivered - a.over
const deliveryRateOf = (a: Agg) => rate(netDelivered(a), a.scheduled || null)

async function statsTotals(scope: ReportScope, w: Window): Promise<Agg> {
  const [row] = await prisma.$queryRaw<RawAgg[]>`SELECT ${AGG} ${statsBase(scope, w)}`
  return toAgg(row)
}

async function statsSources(scope: ReportScope, w: Window): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ source: string }[]>`SELECT DISTINCT s.source ${statsBase(scope, w)}`
  return rows.map((r) => r.source)
}

/** Totals per group. `keys` are fixed SQL expressions from this file, never request input. */
async function statsGrouped(
  scope: ReportScope,
  w: Window,
  keys: Prisma.Sql[]
): Promise<{ keys: string[]; agg: Agg }[]> {
  const select = Prisma.join(keys.map((k, i) => Prisma.sql`${k}::text AS k${Prisma.raw(String(i))}`), ", ")
  const groupBy = Prisma.raw(keys.map((_, i) => i + 1).join(", "))
  const rows = await prisma.$queryRaw<(RawAgg & Record<string, string>)[]>`
    SELECT ${select}, ${AGG} ${statsBase(scope, w)} GROUP BY ${groupBy}`
  return rows.map((r) => ({ keys: keys.map((_, i) => String(r[`k${i}`])), agg: toAgg(r) }))
}

async function statsByDay(scope: ReportScope, w: Window): Promise<Map<string, Agg>> {
  const grouped = await statsGrouped(scope, w, [Prisma.sql`s.day`])
  return new Map(grouped.map((g) => [g.keys[0]!, g.agg]))
}

/** Active vehicles: the busiest daypart per campaign per day, then summed across campaigns. */
async function activeVehiclesByDay(scope: ReportScope, w: Window): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ day: string; vehicles: number }[]>`
    WITH per_daypart AS (
      SELECT s.campaign_id, s.day, s.daypart, SUM(s.active_vehicles) AS dv ${statsBase(scope, w)}
      GROUP BY s.campaign_id, s.day, s.daypart
    ), per_campaign AS (
      SELECT campaign_id, day, MAX(dv) AS mv FROM per_daypart GROUP BY campaign_id, day
    )
    SELECT day::text AS day, SUM(mv)::float8 AS vehicles FROM per_campaign GROUP BY day ORDER BY day`
  return new Map(rows.map((r) => [r.day, num(r.vehicles)]))
}

async function creativeRotation(scope: ReportScope, w: Window): Promise<CreativeRotationRowDto[]> {
  // Creative rows have no market or daypart, so only the campaign filter applies to them.
  const rows = await prisma.$queryRaw<{ name: string; plays: number; likely: number | null }[]>`
    SELECT cs.creative_name AS name, SUM(cs.plays_delivered)::float8 AS plays,
           SUM(cs.impressions_likely)::float8 AS likely
    FROM campaign_creative_daily_stats cs JOIN campaigns c ON c.id = cs.campaign_id
    WHERE c.org_id = ${scope.orgId} AND cs.day BETWEEN ${w.start}::date AND ${w.end}::date
      ${scope.filters.campaignId ? Prisma.sql`AND cs.campaign_id = ${scope.filters.campaignId}` : Prisma.empty}
    GROUP BY cs.creative_name ORDER BY plays DESC, cs.creative_name`
  const total = rows.reduce((sum, r) => sum + num(r.plays), 0)
  return rows.map((r) => ({
    name: r.name,
    plays: num(r.plays),
    share: rate(num(r.plays), total || null),
    impressionsLikely: nullable(r.likely),
  }))
}

type ReachRow = { reach_low: number; reach_likely: number; reach_high: number; as_of: string }

/** The latest reach row of one campaign, or null. Under a market or daypart filter it isn't comparable. */
async function latestReach(scope: ReportScope, w: Window): Promise<ReachRow | null> {
  const f = scope.filters
  if (!f.campaignId || f.market || f.daypart || f.format) return null
  const [row] = await prisma.$queryRaw<ReachRow[]>`
    SELECT r.reach_low, r.reach_likely, r.reach_high, r.as_of::text AS as_of
    FROM campaign_reach_stats r JOIN campaigns c ON c.id = r.campaign_id
    WHERE c.org_id = ${scope.orgId} AND r.campaign_id = ${f.campaignId} AND r.as_of <= ${w.end}::date
    ORDER BY r.as_of DESC LIMIT 1`
  return row ?? null
}

// ---------------------------------------------------------------------------
// Spend (from the ledger, own campaigns only)
// ---------------------------------------------------------------------------

type SpendRow = {
  campaignId: number
  name: string
  objective: string | null
  format: string
  spent: number
  spentExTax: number
}

/** Net spend per campaign in a window. A ledger row pointing at another org's campaign is skipped. */
async function spendByCampaign(scope: ReportScope, w: Window | null): Promise<SpendRow[]> {
  const rows = await prisma.$queryRaw<
    { campaign_id: number; name: string; objective: string | null; format: string; spent: number; spent_ex_tax: number }[]
  >`
    SELECT c.id AS campaign_id, c.name, c.objective, c.format,
           (-COALESCE(SUM(t.amount_kes), 0))::float8 AS spent,
           (-COALESCE(SUM(t.amount_kes) FILTER (WHERE t.spend_category IS DISTINCT FROM 'tax'), 0))::float8 AS spent_ex_tax
    FROM wallet_transactions t JOIN campaigns c ON c.id = t.campaign_id AND c.org_id = t.org_id
    WHERE t.org_id = ${scope.orgId} AND t.kind IN ('spend', 'refund')
      ${w ? Prisma.sql`AND ${ledgerInRange(w.start, w.end)}` : Prisma.empty}
      ${scope.filters.campaignId ? Prisma.sql`AND t.campaign_id = ${scope.filters.campaignId}` : Prisma.empty}
    GROUP BY c.id, c.name, c.objective, c.format`
  return rows.map((r) => ({
    campaignId: r.campaign_id,
    name: r.name,
    objective: r.objective,
    format: r.format,
    spent: roundTo(num(r.spent)),
    spentExTax: roundTo(num(r.spent_ex_tax)),
  }))
}

const sumBy = <T>(rows: T[], pick: (row: T) => number) => rows.reduce((total, row) => total + pick(row), 0)

async function spendExTaxByDay(scope: ReportScope, w: Window): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ day: string; spent: number }[]>`
    SELECT ${LEDGER_DAY}::text AS day,
           (-COALESCE(SUM(t.amount_kes) FILTER (WHERE t.spend_category IS DISTINCT FROM 'tax'), 0))::float8 AS spent
    FROM wallet_transactions t JOIN campaigns c ON c.id = t.campaign_id AND c.org_id = t.org_id
    WHERE t.org_id = ${scope.orgId} AND t.kind IN ('spend', 'refund') AND ${ledgerInRange(w.start, w.end)}
      ${scope.filters.campaignId ? Prisma.sql`AND t.campaign_id = ${scope.filters.campaignId}` : Prisma.empty}
    GROUP BY 1`
  return new Map(rows.map((r) => [r.day, num(r.spent)]))
}

// ---------------------------------------------------------------------------
// Campaign rows
// ---------------------------------------------------------------------------

type CampaignRecord = Prisma.CampaignGetPayload<{ include: { _count: { select: { creatives: true } } } }>

function loadCampaigns(scope: ReportScope): Promise<CampaignRecord[]> {
  return prisma.campaign.findMany({
    where: scope.filters.campaignId
      ? { id: scope.filters.campaignId, org_id: scope.orgId }
      : { org_id: scope.orgId, status: { notIn: ["draft", "cancelled"] } },
    include: { _count: { select: { creatives: true } } },
    orderBy: [{ starts_on: "desc" }, { id: "desc" }],
  })
}

/** Plays up to today, ignoring every filter: a campaign's health is about the whole flight. */
async function lifetimeRates(scope: ReportScope, today: string): Promise<Map<number, number | null>> {
  const rows = await prisma.$queryRaw<{ campaign_id: number; scheduled: number; net: number }[]>`
    SELECT s.campaign_id, COALESCE(SUM(s.plays_scheduled), 0)::float8 AS scheduled,
           COALESCE(SUM(s.plays_delivered - s.plays_over), 0)::float8 AS net
    FROM campaign_daily_stats s JOIN campaigns c ON c.id = s.campaign_id
    WHERE c.org_id = ${scope.orgId} AND s.day <= ${today}::date
    GROUP BY s.campaign_id`
  return new Map(rows.map((r) => [r.campaign_id, rate(num(r.net), num(r.scheduled) || null)]))
}

const dayOf = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null)

async function loadRows(
  scope: ReportScope,
  w: Window
): Promise<{ rows: ReportCampaignRowDto[]; unspentKes: number | null }> {
  const today = nairobiDay(scope.today ?? new Date())
  const [campaigns, perCampaign, lifetime, spendInRange, spendLifetime] = await Promise.all([
    loadCampaigns(scope),
    statsGrouped(scope, w, [Prisma.sql`s.campaign_id`]),
    lifetimeRates(scope, today),
    canSeeSpend(scope) ? spendByCampaign(scope, w) : Promise.resolve([] as SpendRow[]),
    scope.canSeeMoney ? spendByCampaign(scope, null) : Promise.resolve([] as SpendRow[]),
  ])
  const aggs = new Map(perCampaign.map((g) => [Number(g.keys[0]), g.agg]))
  const spendMap = new Map(spendInRange.map((s) => [s.campaignId, s]))
  const lifetimeSpend = new Map(spendLifetime.map((s) => [s.campaignId, s.spent]))

  const rows = campaigns.map((c): ReportCampaignRowDto => {
    const agg = aggs.get(c.id) ?? EMPTY_AGG
    const startsOn = dayOf(c.starts_on)
    const spend = spendMap.get(c.id)
    return {
      id: c.id,
      name: c.name,
      market: c.market,
      format: c.format,
      objective: c.objective,
      status: c.status,
      phase: campaignFlightPhase(c.status, c.starts_on, c.ends_on, scope.today),
      startsOn,
      endsOn: dayOf(c.ends_on),
      budgetKes: permissionGated(scope, c.budget_kes == null ? null : num(c.budget_kes)),
      spentKes: spendGated(scope, spend?.spent ?? 0),
      playsScheduled: agg.scheduled,
      playsDelivered: agg.delivered,
      deliveryRate: deliveryRateOf(agg),
      impressions: { low: agg.low, likely: agg.likely, high: agg.high },
      costPerThousandKes: spendGated(scope, costPerThousand(spend?.spentExTax ?? 0, agg.likely)),
      health: campaignHealth({
        status: c.status,
        startsOn,
        endsOn: dayOf(c.ends_on),
        today,
        hasCreative: c._count.creatives > 0,
        deliveryRate: lifetime.get(c.id) ?? null,
        daysIntoFlight: startsOn ? Math.max(0, daysBetween(startsOn, today)) : 0,
      }),
    }
  })

  const unspentKes = scope.canSeeMoney
    ? roundTo(
        sumBy(
          campaigns.filter((c) => {
            const phase = campaignFlightPhase(c.status, c.starts_on, c.ends_on, scope.today)
            return phase === "live" || phase === "scheduled"
          }),
          (c) => Math.max(0, num(c.budget_kes) - (lifetimeSpend.get(c.id) ?? 0))
        )
      )
    : null
  return { rows, unspentKes }
}

export async function getCampaignRows(scope: ReportScope): Promise<ReportCampaignRowDto[]> {
  const w = await windows(scope)
  return (await loadRows(scope, w.current)).rows
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

/** The largest group by impressions, or by plays when nothing carries an estimate. */
function topOf(groups: { name: string; agg: Agg }[], useImpressions: boolean): NamedValue | null {
  const scored = groups
    .map((g) => ({ name: g.name, value: useImpressions ? (g.agg.likely ?? 0) : g.agg.delivered }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value)
  return scored[0] ?? null
}

function pacingDays(days: string[], byDay: Map<string, Agg>): DailyPoint[] {
  return days.map((day) => {
    const a = byDay.get(day) ?? EMPTY_AGG
    const r = deliveryRateOf(a)
    return { day, scheduled: a.scheduled, delivered: netDelivered(a), percent: r === null ? null : roundTo(r * 100, 1) }
  })
}

export async function getReportOverview(scope: ReportScope): Promise<ReportOverviewDto> {
  const w = await windows(scope)
  const sees = canSeeSpend(scope)
  const days = eachDay(w.current)

  const [cur, prev, sources, byDay, byMarket, byDaypart, creatives, reach, built, spendCur, spendPrev] =
    await Promise.all([
      statsTotals(scope, w.current),
      w.previous ? statsTotals(scope, w.previous) : Promise.resolve(null),
      statsSources(scope, w.current),
      statsByDay(scope, w.current),
      statsGrouped(scope, w.current, [Prisma.sql`s.market`]),
      statsGrouped(scope, w.current, [Prisma.sql`s.daypart`]),
      creativeRotation(scope, w.current),
      latestReach(scope, w.current),
      loadRows(scope, w.current),
      sees ? spendByCampaign(scope, w.current) : Promise.resolve([] as SpendRow[]),
      sees && w.previous ? spendByCampaign(scope, w.previous) : Promise.resolve([] as SpendRow[]),
    ])

  const hasImpressions = cur.likely !== null
  const curRate = deliveryRateOf(cur)
  const prevRate = prev ? deliveryRateOf(prev) : null
  const curCost = costPerThousand(sumBy(spendCur, (s) => s.spentExTax), cur.likely)
  const prevCost = prev ? costPerThousand(sumBy(spendPrev, (s) => s.spentExTax), prev.likely) : null
  const cost = spendGated(scope, curCost)

  const remaining = Math.max(0, cur.scheduled - netDelivered(cur))
  const { rows, unspentKes } = built

  return {
    range: scope.range,
    measurementLevel: measurementLevel(sources),
    hasDeliveryRows: cur.rows > 0,
    impressions:
      cur.likely === null
        ? null
        : { ...delta(cur.likely, prev?.likely ?? null), low: cur.low, high: cur.high },
    impressionsTrend: days.map((day) => {
      const a = byDay.get(day)
      return { day, impressions: a?.likely ?? null, low: a?.low ?? null, high: a?.high ?? null }
    }),
    playsDelivered: delta(cur.delivered, prev ? prev.delivered : null),
    deliveryRate: curRate === null ? null : delta(curRate, prevRate),
    reachLikely: reach?.reach_likely ?? null,
    costPerThousandKes: cost === null ? null : delta(cost, prevCost),
    pacing: {
      delivered: netDelivered(cur),
      remaining,
      rate: curRate,
      days: pacingDays(days, byDay),
    },
    whatsWorking: {
      topMarket: topOf(byMarket.map((g) => ({ name: g.keys[0]!, agg: g.agg })), hasImpressions),
      topDaypart: topOf(
        byDaypart.map((g) => ({ name: DAYPART_LABELS[g.keys[0] as Daypart] ?? g.keys[0]!, agg: g.agg })),
        hasImpressions
      ),
      topCreative: (() => {
        const best = [...creatives].sort(
          (a, b) => (hasImpressions ? (b.impressionsLikely ?? 0) - (a.impressionsLikely ?? 0) : b.plays - a.plays)
        )[0]
        const value = best ? (hasImpressions ? (best.impressionsLikely ?? 0) : best.plays) : 0
        return best && value > 0 ? { name: best.name, value } : null
      })(),
    },
    ledger: {
      atRisk: rows.filter((r) => r.health.level === "at_risk" || r.health.level === "action_needed").length,
      watch: rows.filter((r) => r.health.level === "watch").length,
      endingSoon: rows.filter(
        (r) =>
          r.phase === "live" &&
          r.endsOn !== null &&
          daysBetween(nairobiDay(scope.today ?? new Date()), r.endsOn) <= ENDING_SOON_DAYS
      ).length,
      unspentBudgetKes: unspentKes,
      rows,
    },
  }
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export async function getReportDelivery(scope: ReportScope): Promise<ReportDeliveryDto> {
  const w = await windows(scope)
  const days = eachDay(w.current)
  const [cur, sources, byDay, byDaypart, vehicles, creatives] = await Promise.all([
    statsTotals(scope, w.current),
    statsSources(scope, w.current),
    statsByDay(scope, w.current),
    statsGrouped(scope, w.current, [Prisma.sql`s.daypart`]),
    activeVehiclesByDay(scope, w.current),
    creativeRotation(scope, w.current),
  ])

  return {
    range: scope.range,
    measurementLevel: measurementLevel(sources),
    hasDeliveryRows: cur.rows > 0,
    totals: {
      scheduled: cur.scheduled,
      delivered: cur.delivered,
      missed: cur.missed,
      over: cur.over,
      vehicleHours: cur.vehicleHours,
      distanceKm: cur.distanceKm,
    },
    deliveryRate: deliveryRateOf(cur),
    trend: days.map((day) => {
      const a = byDay.get(day) ?? EMPTY_AGG
      return { day, scheduled: a.scheduled, delivered: a.delivered }
    }),
    missedByDaypart: byDaypart
      .map((g) => ({ name: DAYPART_LABELS[g.keys[0] as Daypart] ?? g.keys[0]!, value: g.agg.missed }))
      .sort((a, b) => b.value - a.value),
    activeVehiclesTrend: days.map((day) => ({ day, vehicles: vehicles.get(day) ?? 0 })),
    creatives,
    dailyLog: days.map((day) => {
      const a = byDay.get(day) ?? EMPTY_AGG
      return { day, scheduled: a.scheduled, delivered: a.delivered, missed: a.missed, over: a.over }
    }),
  }
}

// ---------------------------------------------------------------------------
// Audience
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const heatOf = (groups: { keys: string[]; agg: Agg }[], xLabel: (k: string) => string, yLabel: (k: string) => string): HeatCell[] =>
  groups.map((g) => ({ x: xLabel(g.keys[0]!), y: yLabel(g.keys[1]!), value: g.agg.likely }))

export async function getReportAudience(scope: ReportScope): Promise<ReportAudienceDto> {
  const w = await windows(scope)
  const [cur, sources, marketDaypart, weekdayDaypart, byMarket, prevByMarket, byDaypart, reach] = await Promise.all([
    statsTotals(scope, w.current),
    statsSources(scope, w.current),
    statsGrouped(scope, w.current, [Prisma.sql`s.market`, Prisma.sql`s.daypart`]),
    statsGrouped(scope, w.current, [Prisma.sql`EXTRACT(ISODOW FROM s.day)::int`, Prisma.sql`s.daypart`]),
    statsGrouped(scope, w.current, [Prisma.sql`s.market`]),
    w.previous ? statsGrouped(scope, w.previous, [Prisma.sql`s.market`]) : Promise.resolve(null),
    statsGrouped(scope, w.current, [Prisma.sql`s.daypart`]),
    latestReach(scope, w.current),
  ])

  const prevMarkets = new Map((prevByMarket ?? []).map((g) => [g.keys[0]!, g.agg.likely]))
  const markets = byMarket
    .map((g) => ({ name: g.keys[0]!, value: g.agg.likely ?? 0 }))
    .sort((a, b) => b.value - a.value)
  const daypartLabel = (k: string) => DAYPART_LABELS[k as Daypart] ?? k
  const reachLikely = reach?.reach_likely ?? null

  return {
    range: scope.range,
    measurementLevel: measurementLevel(sources),
    hasDeliveryRows: cur.rows > 0,
    marketByDaypart: heatOf(marketDaypart, (k) => k, daypartLabel),
    byMarket: markets.map((m) => ({
      ...m,
      change: prevByMarket ? delta(m.value, prevMarkets.get(m.name) ?? null).change : null,
    })),
    weekdayByDaypart: heatOf(weekdayDaypart, (k) => WEEKDAYS[Number(k) - 1] ?? k, daypartLabel),
    daypartShare: byDaypart
      .map((g) => ({ name: daypartLabel(g.keys[0]!), value: g.agg.likely ?? 0 }))
      .filter((d) => d.value > 0),
    reach: reach
      ? {
          low: reach.reach_low,
          likely: reach.reach_likely,
          high: reach.reach_high,
          frequency: frequency(cur.likely, reachLikely),
          asOf: reach.as_of,
        }
      : null,
    marketImpressions: markets,
  }
}

// ---------------------------------------------------------------------------
// Spend
// ---------------------------------------------------------------------------

/** The caller must hold `billing:read`; the route enforces it. Filters still null spend-based values. */
export async function getReportSpend(scope: ReportScope): Promise<ReportSpendDto> {
  const w = await windows(scope)
  const days = eachDay(w.current)
  const sees = canSeeSpend(scope)

  const [cur, sources, byDay, built, spendCur, spendPrev, lifetime, spendDays] = await Promise.all([
    statsTotals(scope, w.current),
    statsSources(scope, w.current),
    statsByDay(scope, w.current),
    loadRows(scope, w.current),
    sees ? spendByCampaign(scope, w.current) : Promise.resolve([] as SpendRow[]),
    sees && w.previous ? spendByCampaign(scope, w.previous) : Promise.resolve([] as SpendRow[]),
    scope.canSeeMoney ? spendByCampaign(scope, null) : Promise.resolve([] as SpendRow[]),
    sees ? spendExTaxByDay(scope, w.current) : Promise.resolve(new Map<string, number>()),
  ])

  const lifetimeSpend = new Map(lifetime.map((s) => [s.campaignId, s.spent]))
  const budgetOf = (row: ReportCampaignRowDto) => row.budgetKes ?? 0
  const totalBudget = sumBy(built.rows, budgetOf)
  const totalSpentLifetime = sumBy(built.rows, (r) => lifetimeSpend.get(r.id) ?? 0)
  const today = nairobiDay(scope.today ?? new Date())

  const groupSpend = (pick: (s: SpendRow) => string): NamedValue[] =>
    foldOther(
      [...spendCur.reduce((map, s) => map.set(pick(s), (map.get(pick(s)) ?? 0) + s.spent), new Map<string, number>())]
        .map(([name, value]) => ({ name, value: roundTo(value) }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
    )

  return {
    range: scope.range,
    measurementLevel: measurementLevel(sources),
    hasDeliveryRows: cur.rows > 0,
    spentKes: sees ? delta(sumBy(spendCur, (s) => s.spent), w.previous ? sumBy(spendPrev, (s) => s.spent) : null) : null,
    costPerThousandKes: spendGated(scope, costPerThousand(sumBy(spendCur, (s) => s.spentExTax), cur.likely)),
    budgetKes: permissionGated(scope, roundTo(totalBudget)),
    budgetUsed: permissionGated(scope, totalBudget > 0 ? roundTo(totalSpentLifetime / totalBudget, 4) : null),
    unspentKes: built.unspentKes,
    costPerThousandTrend: days.map((day) => ({
      day,
      cost: sees ? costPerThousand(spendDays.get(day) ?? 0, byDay.get(day)?.likely ?? null) : null,
    })),
    byCampaign: sees ? groupSpend((s) => s.name) : null,
    byObjective: sees ? groupSpend((s) => s.objective ?? "Not set") : null,
    byFormat: sees ? groupSpend((s) => s.format) : null,
    burn: built.rows
      .filter((r) => r.phase === "live" || r.phase === "scheduled" || r.phase === "completed")
      .map((r) => {
        const used = r.budgetKes ? (lifetimeSpend.get(r.id) ?? 0) / r.budgetKes : null
        const total = r.startsOn && r.endsOn ? daysBetween(r.startsOn, r.endsOn) + 1 : 0
        const elapsed = r.startsOn && total > 0 ? Math.min(1, Math.max(0, (daysBetween(r.startsOn, today) + 1) / total)) : null
        return {
          campaignId: r.id,
          name: r.name,
          budgetUsed: permissionGated(scope, used === null ? null : roundTo(used, 4)),
          flightElapsed: elapsed === null ? null : roundTo(elapsed, 4),
        }
      }),
  }
}

// ---------------------------------------------------------------------------
// One campaign
// ---------------------------------------------------------------------------

/** The caller has already checked `campaign` belongs to the org; `scope.filters.campaignId` is its id. */
export async function getCampaignReport(scope: ReportScope): Promise<CampaignReportDto | null> {
  const w = await windows(scope)
  const days = eachDay(w.current)
  const [cur, sources, byDay, marketDaypart, byMarket, creatives, reach, built, lifetime] = await Promise.all([
    statsTotals(scope, w.current),
    statsSources(scope, w.current),
    statsByDay(scope, w.current),
    statsGrouped(scope, w.current, [Prisma.sql`s.market`, Prisma.sql`s.daypart`]),
    statsGrouped(scope, w.current, [Prisma.sql`s.market`]),
    creativeRotation(scope, w.current),
    latestReach(scope, w.current),
    loadRows(scope, w.current),
    scope.canSeeMoney ? spendByCampaign(scope, null) : Promise.resolve([] as SpendRow[]),
  ])
  const row = built.rows[0]
  if (!row) return null

  const spentLifetime = lifetime[0]?.spent ?? 0
  const total = row.startsOn && row.endsOn ? daysBetween(row.startsOn, row.endsOn) + 1 : 0
  const today = nairobiDay(scope.today ?? new Date())
  const impressions: ImpressionRange = { low: cur.low, likely: cur.likely, high: cur.high }

  return {
    range: scope.range,
    measurementLevel: measurementLevel(sources),
    hasDeliveryRows: cur.rows > 0,
    campaign: row,
    flightElapsed:
      row.startsOn && total > 0
        ? roundTo(Math.min(1, Math.max(0, (daysBetween(row.startsOn, today) + 1) / total)), 4)
        : null,
    kpis: {
      impressions,
      reach: reach ? { low: reach.reach_low, likely: reach.reach_likely, high: reach.reach_high } : null,
      frequency: frequency(cur.likely, reach?.reach_likely ?? null),
      playsDelivered: cur.delivered,
      deliveryRate: deliveryRateOf(cur),
      costPerThousandKes: row.costPerThousandKes,
    },
    pacing: pacingDays(days, byDay),
    marketByDaypart: heatOf(marketDaypart, (k) => k, (k) => DAYPART_LABELS[k as Daypart] ?? k),
    marketImpressions: byMarket
      .map((g) => ({ name: g.keys[0]!, value: g.agg.likely ?? 0 }))
      .sort((a, b) => b.value - a.value),
    creatives,
    dailyLog: days.map((day) => {
      const a = byDay.get(day) ?? EMPTY_AGG
      return { day, scheduled: a.scheduled, delivered: a.delivered, missed: a.missed, over: a.over }
    }),
    budget: {
      budgetKes: row.budgetKes,
      spentKes: permissionGated(scope, roundTo(spentLifetime)),
      remainingKes:
        row.budgetKes === null ? null : permissionGated(scope, roundTo(Math.max(0, row.budgetKes - spentLifetime))),
    },
  }
}

/**
 * Stats rows for a proof-of-play PDF. The caller has already checked the campaign belongs to
 * the org; the org filter is repeated here so this can't be called with a foreign id.
 */
export async function getProofOfPlayStats(orgId: number, campaignId: number): Promise<ProofOfPlayStat[]> {
  const rows = await prisma.campaignDailyStat.findMany({
    where: { campaign_id: campaignId, campaign: { org_id: orgId } },
    orderBy: { day: "asc" },
  })
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    market: r.market,
    playsDelivered: r.plays_delivered,
    impressionsLow: r.impressions_low,
    impressionsLikely: r.impressions_likely,
    impressionsHigh: r.impressions_high,
    source: r.source,
  }))
}
