import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma, PrismaClient } from "@prisma/client"
import { fileURLToPath } from "node:url"

import {
  DAYPARTS,
  nairobiDay,
  SEVERITY_BY_TYPE,
  SPEND_CATEGORY_LABELS,
  SUPPORT_CHANNELS,
  type Daypart,
  type InvoiceLineDto,
  type SafetyIncidentType,
  type SpendCategory,
} from "@workspace/ops-contracts"

import { resolveDatabaseUrl } from "@/lib/resolve-database-url"

/**
 * Dev-only demo data, so every dashboard looks complete on local and staging
 * (both use the dev Neon branch) while prod stays honestly empty. Each run
 * wipes every demo row and writes a fresh, deterministic set, so re-running
 * never double-counts. There is deliberately no `:prod` script.
 */

/** Neon dev branch, pooled or direct. Prod is `ep-winter-rain-…`. */
export const DEV_DB_HOST_PREFIXES = ["ep-sparkling-waterfall-"]
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"])

export const DEMO_SEED = 42
export const MAX_DEMO_ROWS = 50_000
export const DEMO_CAMPAIGN_NOTES = "[demo-seed]"
export const DEMO_EMAIL_DOMAIN = "@demo.admobihq.invalid"
export const DEMO_CLERK_PREFIX = "demo_"

const DAY_MS = 86_400_000
const STATS_WINDOW_DAYS = 180
const OPS_EMAIL = `ops${DEMO_EMAIL_DOMAIN}`

export function assertDevDatabase(url: string | undefined): asserts url is string {
  if (!url?.trim()) {
    throw new Error("Refusing to seed: no database URL is set.")
  }
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error("Refusing to seed: the database URL is not a valid URL.")
  }
  const isDevNeon = host.endsWith(".neon.tech") && DEV_DB_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))
  if (!isDevNeon && !LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to seed: ${host} is not an allowlisted dev database (${DEV_DB_HOST_PREFIXES.join(", ")}*.neon.tech or localhost).`,
    )
  }
}

/** The URL the app would connect to, checked against the dev allowlist. */
export function guardedDatabaseUrl(): string {
  const url = resolveDatabaseUrl()
  assertDevDatabase(url)
  return url
}

// --- Deterministic randomness ------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

type Rand = () => number

function jitter(rand: Rand, spread: number): number {
  return 1 + (rand() * 2 - 1) * spread
}

function between(rand: Rand, low: number, high: number): number {
  return Math.floor(low + rand() * (high - low + 1))
}

function pick<T>(rand: Rand, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function ceilTo(n: number, step: number): number {
  return Math.ceil(n / step) * step
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0")
}

// --- Days ---------------------------------------------------------------------
// Days are UTC-midnight Dates standing for Africa/Nairobi calendar days.

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDays(day: Date, n: number): Date {
  return new Date(day.getTime() + n * DAY_MS)
}

/** An instant at `hour:minute` Nairobi time (UTC+3, no DST) on `day`. */
function nairobiAt(day: Date, hour: number, minute = 0): Date {
  return new Date(day.getTime() + ((hour - 3) * 60 + minute) * 60_000)
}

function monthStart(day: Date): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1))
}

function addMonths(day: Date, n: number): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + n, 1))
}

function isWeekend(day: Date): boolean {
  const weekday = day.getUTCDay()
  return weekday === 0 || weekday === 6
}

// --- Org plan -----------------------------------------------------------------

export type DemoState =
  "healthy" | "under_delivering" | "changes_requested" | "ending_soon" | "completed" | "no_creative"

type StatsSource = "logged" | "modelled" | "calibrated"

type CampaignSpec = {
  demoState: DemoState
  name: string
  objective: string
  status: string
  startOffset: number
  endOffset: number
  budgetKes: number
  markets: string[]
  format: "taxi_top" | "delivery_bike"
  vehicles: number
  source: StatsSource | null
  deliveryRate: number
  creativeNames: string[]
  reviewReason?: string
}

const CAMPAIGN_SPECS: CampaignSpec[] = [
  {
    demoState: "completed",
    name: "Mid-year sale",
    objective: "promo",
    status: "approved",
    startOffset: -178,
    endOffset: -96,
    budgetKes: 820_000,
    markets: ["Kilimani", "Westlands"],
    format: "taxi_top",
    vehicles: 12,
    source: "modelled",
    deliveryRate: 0.99,
    creativeNames: ["Sale hero 15s", "Price drop 10s"],
  },
  {
    demoState: "healthy",
    name: "Brand awareness Q4",
    objective: "awareness",
    status: "approved",
    startOffset: -64,
    endOffset: 46,
    budgetKes: 960_000,
    markets: ["CBD", "Westlands"],
    format: "taxi_top",
    vehicles: 14,
    source: "calibrated",
    deliveryRate: 0.985,
    creativeNames: ["Brand film 15s", "Logo loop 10s", "Tagline 10s"],
  },
  {
    demoState: "under_delivering",
    name: "Delivery app push",
    objective: "launch",
    status: "approved",
    startOffset: -38,
    endOffset: 30,
    budgetKes: 540_000,
    markets: ["Eastlands"],
    format: "delivery_bike",
    vehicles: 16,
    source: "logged",
    deliveryRate: 0.68,
    creativeNames: ["Download now 10s"],
  },
  {
    demoState: "ending_soon",
    name: "October promotion",
    objective: "footfall",
    status: "approved",
    startOffset: -86,
    endOffset: 4,
    budgetKes: 720_000,
    markets: ["CBD", "Mombasa Rd"],
    format: "taxi_top",
    vehicles: 10,
    source: "modelled",
    deliveryRate: 0.97,
    creativeNames: ["Store opening 15s", "Weekend offer 10s"],
  },
  {
    demoState: "changes_requested",
    name: "Holiday menu teaser",
    objective: "promo",
    status: "changes_requested",
    startOffset: 12,
    endOffset: 55,
    budgetKes: 450_000,
    markets: ["Karen"],
    format: "delivery_bike",
    vehicles: 8,
    source: null,
    deliveryRate: 0,
    creativeNames: ["Menu teaser 10s"],
    reviewReason:
      "The headline is too small to read on a moving bike box. Please enlarge it to at least a third of the panel height and resubmit.",
  },
  {
    demoState: "no_creative",
    name: "December launch",
    objective: "launch",
    status: "submitted",
    startOffset: 5,
    endOffset: 40,
    budgetKes: 380_000,
    markets: ["CBD"],
    format: "taxi_top",
    vehicles: 10,
    source: null,
    deliveryRate: 0,
    creativeNames: [],
  },
]

/** How busy each daypart is, relative to the day: evening peak, weekday commute. */
const DAYPART_ACTIVITY: Record<"weekday" | "weekend", Record<Daypart, number>> = {
  weekday: { morning: 1.15, midday: 0.8, evening: 1.35, night: 0.55 },
  weekend: { morning: 0.6, midday: 1.0, evening: 1.2, night: 0.75 },
}
const DAYPART_HOURS: Record<Daypart, number> = { morning: 4, midday: 5, evening: 4, night: 3 }
/** People who see one play, by daypart. */
const DAYPART_FOOTFALL: Record<Daypart, number> = { morning: 1.1, midday: 1.0, evening: 1.25, night: 0.45 }
/** Base viewers per play, CBD heaviest. */
const MARKET_FOOTFALL: Record<string, number> = {
  CBD: 38,
  Westlands: 30,
  "Mombasa Rd": 26,
  Eastlands: 24,
  Kilimani: 22,
  Karen: 14,
}
const MARKET_SPEED_KMH: Record<string, number> = {
  CBD: 12,
  Westlands: 18,
  "Mombasa Rd": 26,
  Eastlands: 20,
  Kilimani: 18,
  Karen: 28,
}
/** A 15-second spot in a 5-minute loop. */
const PLAYS_PER_HOUR = 12
const UTILISATION = 0.8
const IMPRESSION_BANDS: Record<"modelled" | "calibrated", { low: number; high: number }> = {
  modelled: { low: 0.7, high: 1.35 },
  calibrated: { low: 0.87, high: 1.13 },
}
const REACH_BANDS: Record<"modelled" | "calibrated", { low: number; high: number }> = {
  modelled: { low: 0.75, high: 1.3 },
  calibrated: { low: 0.88, high: 1.12 },
}
const MODEL_VERSIONS: Record<"modelled" | "calibrated", string> = {
  modelled: "demo-modelled-v1",
  calibrated: "demo-calibrated-v1",
}
/** Placeholder split of daily burn (spec §4); production is charged once, up front. */
const DAILY_SPLIT: Record<Exclude<SpendCategory, "production">, number> = {
  screen_time: 0.7,
  service_fee: 0.08,
  tax: 0.12,
}
const PRODUCTION_SHARE = 0.1
/** Top-ups land before the day's first charge (production at 08:00). */
const TOP_UP_HOUR = 7

export type DemoCampaign = {
  demoState: DemoState
  creativeNames: string[]
  row: DemoCampaignRow
}

export type DemoCampaignRow = {
  clerk_user_id: string
  org_id: number
  name: string
  objective: string
  market: string
  format: string
  notes: string
  budget_kes: number
  starts_on: Date
  ends_on: Date
  status: string
  submitted_at: Date
  reviewed_at: Date | null
  reviewed_by_email: string | null
  review_reason: string | null
  created_at: Date
}

/** `campaign_id` fields in a plan are indexes into `plan.campaigns` until written. */
export type DemoStat = {
  campaign_id: number
  day: Date
  market: string
  daypart: Daypart
  format: string
  plays_scheduled: number
  plays_delivered: number
  plays_missed: number
  plays_over: number
  vehicle_hours: number
  distance_km: number
  active_vehicles: number
  impressions_low: number | null
  impressions_likely: number | null
  impressions_high: number | null
  source: StatsSource
  model_version: string | null
}

export type DemoCreativeStat = {
  campaign_id: number
  creative_name: string
  day: Date
  plays_delivered: number
  impressions_likely: number | null
}

export type DemoReach = {
  campaign_id: number
  as_of: Date
  reach_low: number
  reach_likely: number
  reach_high: number
  source: "modelled" | "calibrated"
  model_version: string
}

export type DemoTransaction = {
  org_id: number
  campaign_id: number | null
  kind: "top_up" | "spend" | "refund" | "adjustment"
  amount_kes: number
  spend_category: SpendCategory | null
  provider: "seed"
  reference: string
  description: string
  occurred_at: Date
}

export type DemoInvoice = {
  org_id: number
  number: string
  period_start: Date
  period_end: Date
  subtotal_kes: number
  tax_kes: number
  total_kes: number
  status: "issued" | "paid" | "overdue"
  issued_on: Date
  due_on: Date
  paid_at: Date | null
  lines: InvoiceLineDto[]
}

export type OrgDemoPlan = {
  campaigns: DemoCampaign[]
  stats: DemoStat[]
  creativeStats: DemoCreativeStat[]
  reach: DemoReach[]
  transactions: DemoTransaction[]
  invoices: DemoInvoice[]
  /** Ledger balance after the last row. */
  balanceKes: number
  /** What's left on every budget still running or booked. */
  committedKes: number
}

function planCampaign(spec: CampaignSpec, orgId: number, ownerClerkId: string, today: Date): DemoCampaign {
  const startsOn = addDays(today, spec.startOffset)
  const submittedAt = nairobiAt(addDays(startsOn, -21), 10, 15)
  const reviewed = spec.status !== "submitted"
  const row: DemoCampaignRow = {
    clerk_user_id: ownerClerkId,
    org_id: orgId,
    name: spec.name,
    objective: spec.objective,
    market: spec.markets[0]!,
    format: spec.format,
    notes: DEMO_CAMPAIGN_NOTES,
    budget_kes: spec.budgetKes,
    starts_on: startsOn,
    ends_on: addDays(today, spec.endOffset),
    status: spec.status,
    // A campaign waiting in review was submitted recently, not three weeks out.
    submitted_at: reviewed ? submittedAt : nairobiAt(addDays(today, -2), 16, 40),
    reviewed_at: reviewed ? nairobiAt(addDays(startsOn, -19), 11, 30) : null,
    reviewed_by_email: reviewed ? OPS_EMAIL : null,
    review_reason: spec.reviewReason ?? null,
    created_at: nairobiAt(addDays(startsOn, -23), 9, 0),
  }
  return { demoState: spec.demoState, creativeNames: spec.creativeNames, row }
}

function planStats(rand: Rand, spec: CampaignSpec, index: number, today: Date): DemoStat[] {
  if (!spec.source) return []
  const source = spec.source
  const first = Math.max(spec.startOffset, -(STATS_WINDOW_DAYS - 1))
  const last = Math.min(spec.endOffset, -1)
  const rows: DemoStat[] = []
  for (let offset = first; offset <= last; offset++) {
    const day = addDays(today, offset)
    const activity = DAYPART_ACTIVITY[isWeekend(day) ? "weekend" : "weekday"]
    spec.markets.forEach((market, marketIndex) => {
      const share = spec.markets.length === 1 ? 1 : marketIndex === 0 ? 0.65 : 0.35
      for (const daypart of DAYPARTS) {
        const vehicles = Math.max(1, Math.round(spec.vehicles * share * activity[daypart] * jitter(rand, 0.12)))
        const hours = round2(vehicles * DAYPART_HOURS[daypart] * UTILISATION * jitter(rand, 0.08))
        const scheduled = Math.round(hours * PLAYS_PER_HOUR)
        const delivered = Math.round(scheduled * spec.deliveryRate * jitter(rand, 0.03))
        let impressions: Pick<DemoStat, "impressions_low" | "impressions_likely" | "impressions_high"> = {
          impressions_low: null,
          impressions_likely: null,
          impressions_high: null,
        }
        if (source !== "logged") {
          const likely = Math.round(
            delivered * MARKET_FOOTFALL[market]! * DAYPART_FOOTFALL[daypart] * jitter(rand, 0.1),
          )
          const band = IMPRESSION_BANDS[source]
          impressions = {
            impressions_low: Math.round(likely * band.low),
            impressions_likely: likely,
            impressions_high: Math.round(likely * band.high),
          }
        }
        rows.push({
          campaign_id: index,
          day,
          market,
          daypart,
          format: spec.format,
          plays_scheduled: scheduled,
          plays_delivered: delivered,
          plays_missed: Math.max(0, scheduled - delivered),
          plays_over: Math.max(0, delivered - scheduled),
          vehicle_hours: hours,
          distance_km: round2(hours * MARKET_SPEED_KMH[market]! * jitter(rand, 0.1)),
          active_vehicles: vehicles,
          ...impressions,
          source,
          model_version: source === "logged" ? null : MODEL_VERSIONS[source],
        })
      }
    })
  }
  return rows
}

function dayTotals(stats: DemoStat[]): Map<number, { day: Date; delivered: number; impressions: number | null }> {
  const byDay = new Map<number, { day: Date; delivered: number; impressions: number | null }>()
  for (const s of stats) {
    const key = s.day.getTime()
    const total = byDay.get(key) ?? { day: s.day, delivered: 0, impressions: null }
    total.delivered += s.plays_delivered
    if (s.impressions_likely !== null) total.impressions = (total.impressions ?? 0) + s.impressions_likely
    byDay.set(key, total)
  }
  return byDay
}

const CREATIVE_SHARES: Record<number, number[]> = { 1: [1], 2: [0.6, 0.4], 3: [0.5, 0.3, 0.2] }

function planCreativeStats(rand: Rand, spec: CampaignSpec, index: number, stats: DemoStat[]): DemoCreativeStat[] {
  if (spec.creativeNames.length === 0) return []
  const shares = CREATIVE_SHARES[spec.creativeNames.length]!
  const rows: DemoCreativeStat[] = []
  for (const { day, delivered, impressions } of dayTotals(stats).values()) {
    let playsLeft = delivered
    let impressionsLeft = impressions
    spec.creativeNames.forEach((name, i) => {
      const isLast = i === spec.creativeNames.length - 1
      const share = shares[i]! * jitter(rand, 0.05)
      const plays = isLast ? playsLeft : Math.min(playsLeft, Math.round(delivered * share))
      const seen =
        impressionsLeft === null || impressions === null
          ? null
          : isLast
            ? impressionsLeft
            : Math.min(impressionsLeft, Math.round(impressions * share))
      playsLeft -= plays
      if (impressionsLeft !== null && seen !== null) impressionsLeft -= seen
      rows.push({ campaign_id: index, creative_name: name, day, plays_delivered: plays, impressions_likely: seen })
    })
  }
  return rows
}

function planReach(spec: CampaignSpec, index: number, stats: DemoStat[]): DemoReach[] {
  if (spec.source !== "modelled" && spec.source !== "calibrated") return []
  const source = spec.source
  const days = [...dayTotals(stats).values()]
  const rows: DemoReach[] = []
  let cumulative = 0
  days.forEach(({ day, impressions }, i) => {
    cumulative += impressions ?? 0
    if ((i + 1) % 7 !== 0 && i !== days.length - 1) return
    // Frequency climbs from about 3.3 to 5.7 as the same audience sees the ad again.
    const frequency = 3.3 + 2.4 * Math.min(1, (i + 1) / 90)
    const likely = Math.round(cumulative / frequency)
    const band = REACH_BANDS[source]
    rows.push({
      campaign_id: index,
      as_of: day,
      reach_low: Math.round(likely * band.low),
      reach_likely: likely,
      reach_high: Math.round(likely * band.high),
      source,
      model_version: MODEL_VERSIONS[source],
    })
  })
  return rows
}

function planSpend(
  rand: Rand,
  spec: CampaignSpec,
  index: number,
  today: Date,
): Omit<DemoTransaction, "org_id" | "reference">[] {
  const last = Math.min(spec.endOffset, -1)
  if (spec.startOffset > last) return []
  const flightDays = spec.endOffset - spec.startOffset + 1
  const dailyBurn = (spec.budgetKes * (1 - PRODUCTION_SHARE)) / flightDays
  const rows: Omit<DemoTransaction, "org_id" | "reference">[] = [
    {
      campaign_id: index,
      kind: "spend",
      amount_kes: -Math.round(spec.budgetKes * PRODUCTION_SHARE),
      spend_category: "production",
      provider: "seed",
      description: `${SPEND_CATEGORY_LABELS.production} for ${spec.name}`,
      occurred_at: nairobiAt(addDays(today, spec.startOffset), 8, 0),
    },
  ]
  for (let offset = spec.startOffset; offset <= last; offset++) {
    const day = addDays(today, offset)
    for (const category of ["screen_time", "service_fee", "tax"] as const) {
      const share = DAILY_SPLIT[category] / (1 - PRODUCTION_SHARE)
      const amount = Math.round(dailyBurn * share * (category === "screen_time" ? jitter(rand, 0.04) : 1))
      rows.push({
        campaign_id: index,
        kind: "spend",
        amount_kes: -amount,
        spend_category: category,
        provider: "seed",
        description: `${SPEND_CATEGORY_LABELS[category]} for ${spec.name}`,
        occurred_at: nairobiAt(day, 21, 0),
      })
    }
  }
  if (spec.demoState === "under_delivering") {
    const refundDay = addDays(today, -7)
    const screenTime = rows
      .filter((r) => r.spend_category === "screen_time" && r.occurred_at < refundDay)
      .reduce((total, r) => total - r.amount_kes, 0)
    rows.push({
      campaign_id: index,
      kind: "refund",
      amount_kes: Math.round(screenTime * (1 - spec.deliveryRate)),
      spend_category: "screen_time",
      provider: "seed",
      description: `Refund for missed plays on ${spec.name}`,
      occurred_at: nairobiAt(refundDay, 12, 0),
    })
  }
  return rows
}

/**
 * Tops the wallet up on the morning it would otherwise run low. A healthy org
 * keeps about two months ahead and ends with more than it has committed; a
 * short org only ever tops up just enough, so it ends below its commitments
 * and the short-of-funds alert shows.
 */
function planTopUps(
  rand: Rand,
  movements: Omit<DemoTransaction, "org_id" | "reference">[],
  today: Date,
  shortOfFunds: boolean,
): Omit<DemoTransaction, "org_id" | "reference">[] {
  const sorted = [...movements].sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime())
  if (sorted.length === 0) return []
  const debitsBetween = (from: Date, days: number) => {
    const to = addDays(from, days)
    return sorted
      .filter((m) => m.amount_kes < 0 && m.occurred_at >= from && m.occurred_at < to)
      .reduce((total, m) => total - m.amount_kes, 0)
  }
  const topUps: Omit<DemoTransaction, "org_id" | "reference">[] = []
  const topUp = (day: Date, amount: number) => {
    topUps.push({
      campaign_id: null,
      kind: "top_up",
      amount_kes: amount,
      spend_category: null,
      provider: "seed",
      description: rand() < 0.6 ? "M-Pesa top-up" : "Bank transfer top-up",
      occurred_at: nairobiAt(day, TOP_UP_HOUR, 30),
    })
  }

  let balance = 0
  let cursor = 0
  for (let day = utcDay(sorted[0]!.occurred_at); day < today; day = addDays(day, 1)) {
    if (shortOfFunds) {
      if (balance < debitsBetween(day, 3)) {
        const amount = ceilTo(debitsBetween(day, 10), 10_000)
        topUp(day, amount)
        balance += amount
      }
    } else if (balance < debitsBetween(day, 14)) {
      const amount = Math.max(100_000, ceilTo(debitsBetween(day, 45), 50_000))
      topUp(day, amount)
      balance += amount
    }
    const nextDay = addDays(day, 1)
    while (cursor < sorted.length && sorted[cursor]!.occurred_at < nextDay) {
      balance += sorted[cursor]!.amount_kes
      cursor++
    }
  }
  return topUps
}

function planInvoices(
  orgId: number,
  campaigns: DemoCampaign[],
  transactions: DemoTransaction[],
  today: Date,
  shortOfFunds: boolean,
): DemoInvoice[] {
  const thisMonth = monthStart(today).getTime()
  const byMonth = new Map<number, DemoTransaction[]>()
  for (const t of transactions) {
    if (t.kind !== "spend" && t.kind !== "refund") continue
    const month = monthStart(new Date(`${nairobiDay(t.occurred_at)}T00:00:00.000Z`)).getTime()
    if (month >= thisMonth) continue
    byMonth.set(month, [...(byMonth.get(month) ?? []), t])
  }

  const invoices = [...byMonth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([month, rows]): DemoInvoice => {
      const periodStart = new Date(month)
      const issuedOn = addMonths(periodStart, 1)
      const dueOn = addDays(issuedOn, 14)
      const lines = new Map<string, InvoiceLineDto>()
      let taxKes = 0
      for (const t of rows) {
        if (t.spend_category === "tax") {
          taxKes -= t.amount_kes
          continue
        }
        const name = campaigns[t.campaign_id!]!.row.name
        const description =
          t.kind === "refund"
            ? `Refund for missed plays on ${name}`
            : `${name}: ${SPEND_CATEGORY_LABELS[t.spend_category!]}`
        const line = lines.get(description) ?? { description, amountKes: 0 }
        line.amountKes -= t.amount_kes
        lines.set(description, line)
      }
      const subtotal = [...lines.values()].reduce((total, l) => total + l.amountKes, 0)
      return {
        org_id: orgId,
        number: `DEMO-${orgId}-${periodStart.toISOString().slice(0, 7).replace("-", "")}`,
        period_start: periodStart,
        period_end: addDays(issuedOn, -1),
        subtotal_kes: round2(subtotal),
        tax_kes: round2(taxKes),
        total_kes: round2(subtotal + taxKes),
        status: dueOn < today ? "paid" : "issued",
        issued_on: issuedOn,
        due_on: dueOn,
        paid_at: dueOn < today ? nairobiAt(addDays(issuedOn, 6), 11, 0) : null,
        lines: [...lines.values()],
      }
    })

  if (shortOfFunds) {
    const latestPastDue = invoices.filter((i) => i.due_on < today).at(-1)
    if (latestPastDue) {
      latestPastDue.status = "overdue"
      latestPastDue.paid_at = null
    }
  }
  return invoices
}

/**
 * The whole demo for one org, as rows ready to insert. Pure: the same
 * arguments always give the same plan.
 */
export function planOrgDemo(
  orgId: number,
  ownerClerkId: string,
  today: Date,
  seed: number,
  options: { shortOfFunds?: boolean } = {},
): OrgDemoPlan {
  const rand = mulberry32(seed ^ Math.imul(orgId, 0x9e3779b1))
  const day0 = utcDay(today)
  const shortOfFunds = options.shortOfFunds ?? false

  const campaigns = CAMPAIGN_SPECS.map((spec) => planCampaign(spec, orgId, ownerClerkId, day0))
  const stats: DemoStat[] = []
  const creativeStats: DemoCreativeStat[] = []
  const reach: DemoReach[] = []
  const movements: Omit<DemoTransaction, "org_id" | "reference">[] = []
  CAMPAIGN_SPECS.forEach((spec, index) => {
    const campaignStats = planStats(rand, spec, index, day0)
    stats.push(...campaignStats)
    creativeStats.push(...planCreativeStats(rand, spec, index, campaignStats))
    reach.push(...planReach(spec, index, campaignStats))
    movements.push(...planSpend(rand, spec, index, day0))
  })
  movements.push({
    campaign_id: null,
    kind: "adjustment",
    amount_kes: 2_500,
    spend_category: null,
    provider: "seed",
    description: "Goodwill credit for a late start",
    occurred_at: nairobiAt(addDays(day0, -52), 15, 0),
  })

  const spentBy = (index: number) =>
    movements.filter((m) => m.campaign_id === index && m.kind === "spend").reduce((total, m) => total - m.amount_kes, 0)
  const committedKes = CAMPAIGN_SPECS.reduce(
    (total, spec, index) => (spec.endOffset >= 0 ? total + Math.max(0, spec.budgetKes - spentBy(index)) : total),
    0,
  )

  const topUps = planTopUps(rand, movements, day0, shortOfFunds)
  let balanceKes = [...movements, ...topUps].reduce((total, m) => total + m.amount_kes, 0)
  if (!shortOfFunds) {
    const lastMonthSpend = movements
      .filter((m) => m.kind === "spend" && m.occurred_at >= addDays(day0, -30))
      .reduce((total, m) => total - m.amount_kes, 0)
    const shortfall = committedKes + lastMonthSpend - balanceKes
    if (shortfall > 0) {
      const amount = ceilTo(shortfall, 50_000)
      topUps.push({
        campaign_id: null,
        kind: "top_up",
        amount_kes: amount,
        spend_category: null,
        provider: "seed",
        description: "Bank transfer top-up",
        occurred_at: nairobiAt(addDays(day0, -2), TOP_UP_HOUR, 30),
      })
      balanceKes += amount
    }
  }

  const transactions = [...movements, ...topUps]
    .sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime())
    .map((m, i): DemoTransaction => ({ ...m, org_id: orgId, reference: `demo-${orgId}-${pad(i + 1, 5)}` }))

  return {
    campaigns,
    stats,
    creativeStats,
    reach,
    transactions,
    invoices: planInvoices(orgId, campaigns, transactions, day0, shortOfFunds),
    balanceKes,
    committedKes,
  }
}

// --- Global (ops-only) plan ---------------------------------------------------

const FIRST_NAMES =
  "Brian Kevin Dennis Collins Faith Mercy Peter James Joseph Grace Esther Samuel Daniel Moses Lucy Victor Felix Stephen Ruth Eric".split(
    " ",
  )
const LAST_NAMES =
  "Otieno Kamau Mwangi Wanjiru Ochieng Njoroge Kiptoo Mutua Wambui Odhiambo Chebet Kariuki Achieng Kimani Onyango Muthoni".split(
    " ",
  )

export type DemoDriver = {
  name: string
  phone: string
  email: string
  city: string
  vehicle_type: string
  days_per_week: string
  hours_per_day: string
  heard_about: string
  vehicle_make_model: string
  vehicle_ownership: string
  platforms: string[]
  status: "pending" | "verified" | "active"
  created_at: Date
}

/** `driver_id` is an index into `plan.drivers` until written. */
export type DemoPayout = {
  driver_id: number
  amount_kes: number
  status: "pending" | "settled" | "failed"
  mpesa_ref: string | null
  period_month: Date
  paid_at: Date | null
}

export type DemoDriverProfile = {
  clerk_user_id: string
  full_name: string
  phone: string
  city: string
  payout_method: string
  payout_mpesa_msisdn: string
  status: string
  submitted_at: Date | null
  reviewed_at: Date | null
  reviewed_by_email: string | null
  rejection_reason: string | null
  created_at: Date
}

export type DemoSupportCase = {
  driver_clerk_user_id: string | null
  contact_name: string
  contact_email: string
  access_token_hash: string
  channel: string
  category: string
  subject: string
  status: string
  priority: string
  assigned_to_email: string | null
  created_at: Date
  updated_at: Date
}

export type DemoSafetyIncident = {
  driver_clerk_user_id: string
  driver_name: string
  driver_phone: string
  type: SafetyIncidentType
  severity: string
  status: string
  description: string
  reported_lat: number
  reported_lng: number
  reported_accuracy_m: number
  last_lat: number | null
  last_lng: number | null
  last_location_at: Date | null
  acknowledged_at: Date | null
  acknowledged_by_email: string | null
  resolved_at: Date | null
  resolved_by_email: string | null
  resolution: string | null
  created_at: Date
}

export type GlobalDemoPlan = {
  drivers: DemoDriver[]
  payouts: DemoPayout[]
  driverProfiles: DemoDriverProfile[]
  supportCases: DemoSupportCase[]
  safetyIncidents: DemoSafetyIncident[]
}

const SUPPORT_SUBJECTS: Record<string, string[]> = {
  general: ["Question about coverage areas", "How do I add a teammate", "Request for a media kit"],
  billing: ["Invoice shows the wrong company name", "Top-up not reflected yet", "Need a KRA PIN on my invoice"],
  campaign: ["Can I extend my flight by a week", "Change of creative mid-flight", "When will my campaign go live"],
  technical: ["Upload keeps failing on a large video", "Cannot sign in on my phone", "Report page loads slowly"],
  driver: ["Screen not turning on", "Payout not received", "Question about weekly schedule"],
}
const INCIDENT_SEQUENCE =
  "breakdown accident theft vehicle_damage harassment breakdown medical other breakdown accident vehicle_damage theft".split(
    " ",
  ) as SafetyIncidentType[]
const INCIDENT_OFFSETS = [-1, -2, -4, -9, -15, -27, -38, -55, -73, -96, -122, -160]
const INCIDENT_STATUSES = ["new", "acknowledged", "in_progress", "cancelled"]

function personName(rand: Rand): string {
  return `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`
}

function kenyanPhone(rand: Rand): string {
  return `+2547${pad(between(rand, 10_000_000, 99_999_999), 8)}`
}

function demoCity(rand: Rand): string {
  const r = rand()
  return r < 0.7 ? "Nairobi" : r < 0.9 ? "Mombasa" : "Kisumu"
}

export function planGlobalDemo(today: Date, seed: number): GlobalDemoPlan {
  const rand = mulberry32(seed ^ 0x5eed)
  const day0 = utcDay(today)

  const drivers: DemoDriver[] = Array.from({ length: 40 }, (_, i) => {
    const n = i + 1
    const r = rand()
    const vehicleType = r < 0.6 ? "taxi" : r < 0.9 ? "delivery_bike" : "three_wheeler"
    return {
      name: personName(rand),
      phone: kenyanPhone(rand),
      email: `driver${pad(n, 2)}${DEMO_EMAIL_DOMAIN}`,
      city: demoCity(rand),
      vehicle_type: vehicleType,
      days_per_week: pick(rand, ["3_4", "5_6", "daily"]),
      hours_per_day: pick(rand, ["4_8", "8_12", "over_12"]),
      heard_about: pick(rand, ["whatsapp", "facebook", "friend", "roadside"]),
      vehicle_make_model:
        vehicleType === "taxi"
          ? pick(rand, ["Toyota Axio", "Toyota Fielder", "Nissan Note", "Mazda Demio"])
          : vehicleType === "delivery_bike"
            ? pick(rand, ["Boxer BM150", "TVS HLX 125", "Honda Ace 125"])
            : "Bajaj RE",
      vehicle_ownership: pick(rand, ["owned", "rented", "financed"]),
      platforms:
        vehicleType === "taxi" ? ["uber", "bolt"] : vehicleType === "delivery_bike" ? ["independent"] : ["little"],
      status: n <= 22 ? "active" : n <= 30 ? "verified" : "pending",
      created_at: nairobiAt(addDays(day0, -Math.round(175 - i * 4.2)), between(rand, 8, 19), between(rand, 0, 59)),
    }
  })

  // Payouts go out on the 5th of the following month: anything not yet due is
  // pending, and a few in the latest paid run failed.
  const lastMonth = addMonths(monthStart(day0), -1)
  const payDay = (month: Date) => addDays(addMonths(month, 1), 4)
  const latestPaidMonth = payDay(lastMonth) < day0 ? lastMonth : addMonths(lastMonth, -1)
  const payouts: DemoPayout[] = []
  drivers.forEach((driver, index) => {
    if (driver.status !== "active") return
    for (let month = addMonths(monthStart(driver.created_at), 1); month <= lastMonth; month = addMonths(month, 1)) {
      const paidOn = payDay(month)
      const status =
        paidOn >= day0
          ? "pending"
          : month.getTime() === latestPaidMonth.getTime() && index % 9 === 4
            ? "failed"
            : "settled"
      payouts.push({
        driver_id: index,
        amount_kes: Math.round((9_000 + rand() * 15_000) / 50) * 50,
        status,
        mpesa_ref:
          status === "settled" ? `DM${month.toISOString().slice(2, 7).replace("-", "")}${pad(index + 1, 4)}` : null,
        period_month: month,
        paid_at: status === "settled" ? nairobiAt(paidOn, 14, 0) : null,
      })
    }
  })

  const driverProfiles: DemoDriverProfile[] = Array.from({ length: 40 }, (_, i) => {
    const n = i + 1
    const status =
      n <= 18 ? "approved" : n <= 27 ? "submitted" : n <= 31 ? "changes_requested" : n <= 35 ? "rejected" : "draft"
    const createdOffset =
      status === "submitted"
        ? -between(rand, 3, 24)
        : status === "draft"
          ? -between(rand, 1, 30)
          : -between(rand, 20, 175)
    const created = nairobiAt(addDays(day0, createdOffset), between(rand, 8, 20), between(rand, 0, 59))
    const submitted = status === "draft" ? null : new Date(created.getTime() + between(rand, 1, 48) * 3_600_000)
    const reviewed =
      submitted && status !== "submitted"
        ? new Date(Math.min(submitted.getTime() + between(rand, 4, 96) * 3_600_000, day0.getTime() - 3_600_000))
        : null
    const phone = kenyanPhone(rand)
    return {
      clerk_user_id: `${DEMO_CLERK_PREFIX}driver_${pad(n, 2)}`,
      full_name: personName(rand),
      phone,
      city: demoCity(rand),
      payout_method: "mpesa",
      payout_mpesa_msisdn: phone,
      status,
      submitted_at: submitted,
      reviewed_at: reviewed,
      reviewed_by_email: reviewed ? OPS_EMAIL : null,
      rejection_reason:
        status === "rejected"
          ? "The National ID photo does not match the profile photo."
          : status === "changes_requested"
            ? "The KRA PIN certificate is blurred. Please upload a clearer copy."
            : null,
      created_at: created,
    }
  })

  const supportCases: DemoSupportCase[] = Array.from({ length: 60 }, (_, i) => {
    const n = i + 1
    // More recent cases than old ones, like a real inbox.
    const age = Math.floor(179 * ((60 - n) / 60) ** 1.5)
    const created = nairobiAt(addDays(day0, -age - 1), between(rand, 7, 21), between(rand, 0, 59))
    const r = rand()
    const status =
      age > 21
        ? r < 0.7
          ? "resolved"
          : "closed"
        : age > 6
          ? r < 0.5
            ? "resolved"
            : r < 0.75
              ? "pending"
              : "open"
          : r < 0.6
            ? "open"
            : "pending"
    const channel = pick(rand, SUPPORT_CHANNELS)
    const isDriver = channel.startsWith("driver")
    const category = isDriver
      ? "driver"
      : pick(rand, ["general", "billing", "billing", "campaign", "campaign", "technical"])
    const p = rand()
    return {
      driver_clerk_user_id: isDriver ? `${DEMO_CLERK_PREFIX}driver_${pad(1 + (i % 18), 2)}` : null,
      contact_name: personName(rand),
      contact_email: `case${pad(n, 2)}${DEMO_EMAIL_DOMAIN}`,
      access_token_hash: `${DEMO_CLERK_PREFIX}case_${pad(n, 2)}`,
      channel,
      category,
      subject: pick(rand, SUPPORT_SUBJECTS[category]!),
      status,
      priority: p < 0.08 ? "urgent" : p < 0.25 ? "high" : p < 0.85 ? "normal" : "low",
      assigned_to_email: status === "open" ? null : OPS_EMAIL,
      created_at: created,
      updated_at:
        status === "open"
          ? created
          : new Date(Math.min(created.getTime() + between(rand, 2, 72) * 3_600_000, day0.getTime())),
    }
  })

  const approved = driverProfiles.filter((p) => p.status === "approved")
  const safetyIncidents: DemoSafetyIncident[] = INCIDENT_SEQUENCE.map((type, i) => {
    const driver = approved[i % approved.length]!
    const status = INCIDENT_STATUSES[i] ?? "resolved"
    const created = nairobiAt(addDays(day0, INCIDENT_OFFSETS[i]!), between(rand, 6, 22), between(rand, 0, 59))
    const lat = Math.round((-1.286 + (rand() - 0.5) * 0.1) * 1e5) / 1e5
    const lng = Math.round((36.817 + (rand() - 0.5) * 0.14) * 1e5) / 1e5
    const acknowledged = status === "new" ? null : new Date(created.getTime() + between(rand, 2, 9) * 60_000)
    const resolved = status === "resolved" ? new Date(created.getTime() + between(rand, 1, 6) * 3_600_000) : null
    const isOpen = status === "new" || status === "acknowledged" || status === "in_progress"
    return {
      driver_clerk_user_id: driver.clerk_user_id,
      driver_name: driver.full_name,
      driver_phone: driver.phone,
      type,
      severity: SEVERITY_BY_TYPE[type],
      status,
      description: `Demo ${type.replace("_", " ")} report`,
      reported_lat: lat,
      reported_lng: lng,
      reported_accuracy_m: between(rand, 8, 40),
      last_lat: isOpen ? lat : null,
      last_lng: isOpen ? lng : null,
      last_location_at: isOpen ? created : null,
      acknowledged_at: acknowledged,
      acknowledged_by_email: acknowledged ? OPS_EMAIL : null,
      resolved_at: resolved,
      resolved_by_email: resolved ? OPS_EMAIL : null,
      resolution: resolved ? "Driver confirmed safe and the vehicle is back on the road." : null,
      created_at: created,
    }
  })

  return { drivers, payouts, driverProfiles, supportCases, safetyIncidents }
}

// --- Database -----------------------------------------------------------------

export const DEMO_TABLES = [
  "campaigns",
  "campaign_daily_stats",
  "campaign_creative_daily_stats",
  "campaign_reach_stats",
  "wallet_transactions",
  "invoices",
  "drivers",
  "payouts",
  "driver_profiles",
  "support_cases",
  "safety_incidents",
] as const
export type DemoTable = (typeof DEMO_TABLES)[number]
export type DemoCounts = Record<DemoTable, number>

function planCounts(orgPlans: OrgDemoPlan[], global: GlobalDemoPlan): DemoCounts {
  const sum = (rows: (p: OrgDemoPlan) => unknown[]) => orgPlans.reduce((total, p) => total + rows(p).length, 0)
  return {
    campaigns: sum((p) => p.campaigns),
    campaign_daily_stats: sum((p) => p.stats),
    campaign_creative_daily_stats: sum((p) => p.creativeStats),
    campaign_reach_stats: sum((p) => p.reach),
    wallet_transactions: sum((p) => p.transactions),
    invoices: sum((p) => p.invoices),
    drivers: global.drivers.length,
    payouts: global.payouts.length,
    driver_profiles: global.driverProfiles.length,
    support_cases: global.supportCases.length,
    safety_incidents: global.safetyIncidents.length,
  }
}

/**
 * Deletes demo rows by their markers and nothing else. With `orgId`, only that
 * org's demo rows go; the ops-only rows are always replaced.
 */
export async function resetDemoData(db: Prisma.TransactionClient, options: { orgId?: number } = {}): Promise<void> {
  const org = options.orgId === undefined ? {} : { org_id: options.orgId }
  const campaign = options.orgId === undefined ? {} : { campaign: { org_id: options.orgId } }
  await db.campaignDailyStat.deleteMany({ where: { is_demo: true, ...campaign } })
  await db.campaignCreativeDailyStat.deleteMany({ where: { is_demo: true, ...campaign } })
  await db.campaignReachStat.deleteMany({ where: { is_demo: true, ...campaign } })
  await db.walletTransaction.deleteMany({ where: { is_demo: true, ...org } })
  await db.invoice.deleteMany({ where: { is_demo: true, ...org } })
  await db.campaign.deleteMany({ where: { notes: DEMO_CAMPAIGN_NOTES, ...org } })

  await db.payout.deleteMany({ where: { is_demo: true } })
  await db.driver.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } })
  await db.driverProfile.deleteMany({ where: { clerk_user_id: { startsWith: DEMO_CLERK_PREFIX } } })
  await db.supportCase.deleteMany({ where: { contact_email: { endsWith: DEMO_EMAIL_DOMAIN } } })
  await db.safetyIncident.deleteMany({ where: { driver_clerk_user_id: { startsWith: DEMO_CLERK_PREFIX } } })
}

const CHUNK = 1_000

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<{ count: number }>): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    count += (await insert(rows.slice(i, i + CHUNK))).count
  }
  return count
}

async function writeOrgPlan(db: Prisma.TransactionClient, plan: OrgDemoPlan, counts: DemoCounts): Promise<void> {
  const created = await db.campaign.createManyAndReturn({
    data: plan.campaigns.map((c) => c.row),
    select: { id: true, name: true },
  })
  const idByName = new Map(created.map((c) => [c.name, c.id]))
  const ids = plan.campaigns.map((c) => idByName.get(c.row.name)!)
  counts.campaigns += created.length

  counts.campaign_daily_stats += await insertChunked(plan.stats, (chunk) =>
    db.campaignDailyStat.createMany({
      data: chunk.map((s) => ({ ...s, campaign_id: ids[s.campaign_id]!, is_demo: true })),
    }),
  )
  counts.campaign_creative_daily_stats += await insertChunked(plan.creativeStats, (chunk) =>
    db.campaignCreativeDailyStat.createMany({
      data: chunk.map((s) => ({ ...s, campaign_id: ids[s.campaign_id]!, is_demo: true })),
    }),
  )
  counts.campaign_reach_stats += await insertChunked(plan.reach, (chunk) =>
    db.campaignReachStat.createMany({
      data: chunk.map((r) => ({ ...r, campaign_id: ids[r.campaign_id]!, is_demo: true })),
    }),
  )
  counts.wallet_transactions += await insertChunked(plan.transactions, (chunk) =>
    db.walletTransaction.createMany({
      data: chunk.map((t) => ({
        ...t,
        campaign_id: t.campaign_id === null ? null : ids[t.campaign_id]!,
        is_demo: true,
      })),
    }),
  )
  counts.invoices += await insertChunked(plan.invoices, (chunk) =>
    db.invoice.createMany({ data: chunk.map((i) => ({ ...i, is_demo: true })) }),
  )
}

async function writeGlobalPlan(db: Prisma.TransactionClient, plan: GlobalDemoPlan, counts: DemoCounts): Promise<void> {
  const drivers = await db.driver.createManyAndReturn({ data: plan.drivers, select: { id: true, email: true } })
  const idByEmail = new Map(drivers.map((d) => [d.email, d.id]))
  const driverIds = plan.drivers.map((d) => idByEmail.get(d.email)!)
  counts.drivers += drivers.length
  counts.payouts += await insertChunked(plan.payouts, (chunk) =>
    db.payout.createMany({ data: chunk.map((p) => ({ ...p, driver_id: driverIds[p.driver_id]!, is_demo: true })) }),
  )
  counts.driver_profiles += (await db.driverProfile.createMany({ data: plan.driverProfiles })).count
  counts.support_cases += (await db.supportCase.createMany({ data: plan.supportCases })).count
  counts.safety_incidents += (await db.safetyIncident.createMany({ data: plan.safetyIncidents })).count
}

export type SeedSummary = {
  host: string
  orgIds: number[]
  shortOfFundsOrgId: number | null
  counts: DemoCounts
  total: number
}

/**
 * Wipes every demo row (or one org's, with `orgId`) and writes a fresh set for
 * each org that has an active owner, in one transaction. The guard runs before
 * any Prisma client exists.
 */
export async function seedDemoData(options: { orgId?: number; today?: Date } = {}): Promise<SeedSummary> {
  const url = guardedDatabaseUrl()
  const host = new URL(url).hostname
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  try {
    const owners = await prisma.advertiserMember.findMany({
      where: { is_owner: true, removed_at: null, ...(options.orgId === undefined ? {} : { org_id: options.orgId }) },
      orderBy: [{ org_id: "asc" }, { id: "asc" }],
      select: { org_id: true, clerk_user_id: true },
    })
    const targets = [...new Map(owners.map((o) => [o.org_id, o.clerk_user_id])).entries()]
    if (options.orgId !== undefined && targets.length === 0) {
      throw new Error(`Org ${options.orgId} has no active owner, so nobody would see its demo data.`)
    }

    const today = options.today ?? new Date(`${nairobiDay(new Date())}T00:00:00.000Z`)
    const shortOfFundsOrgId = options.orgId === undefined && targets.length >= 2 ? targets.at(-1)![0] : null
    const orgPlans = targets.map(([orgId, ownerClerkId]) =>
      planOrgDemo(orgId, ownerClerkId, today, DEMO_SEED, { shortOfFunds: orgId === shortOfFundsOrgId }),
    )
    const globalPlan = planGlobalDemo(today, DEMO_SEED)
    const planned = Object.values(planCounts(orgPlans, globalPlan)).reduce((a, b) => a + b, 0)
    if (planned > MAX_DEMO_ROWS) {
      throw new Error(
        `Refusing to seed: ${planned} rows is over the ${MAX_DEMO_ROWS} cap. Target one org with --org <id>.`,
      )
    }

    const counts = Object.fromEntries(DEMO_TABLES.map((t) => [t, 0])) as DemoCounts
    await prisma.$transaction(
      async (tx) => {
        await resetDemoData(tx, { orgId: options.orgId })
        for (const plan of orgPlans) await writeOrgPlan(tx, plan, counts)
        await writeGlobalPlan(tx, globalPlan, counts)
      },
      { maxWait: 20_000, timeout: 300_000 },
    )

    return {
      host,
      orgIds: targets.map(([orgId]) => orgId),
      shortOfFundsOrgId,
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    }
  } finally {
    await prisma.$disconnect()
  }
}

function parseOrgArg(argv: string[]): number | undefined {
  const index = argv.findIndex((a) => a === "--org" || a.startsWith("--org="))
  if (index === -1) return undefined
  const raw = argv[index]!.includes("=") ? argv[index]!.split("=")[1] : argv[index + 1]
  const orgId = Number(raw)
  if (!Number.isInteger(orgId) || orgId <= 0) throw new Error(`--org needs a numeric org id, got "${raw ?? ""}".`)
  return orgId
}

const isMain = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  ;(async () => {
    try {
      const summary = await seedDemoData({ orgId: parseOrgArg(process.argv.slice(2)) })
      for (const table of DEMO_TABLES) {
        console.log(`  ${table.padEnd(32)}${summary.counts[table].toLocaleString("en-US").padStart(8)}`)
      }
      console.log(`  ${"total".padEnd(32)}${summary.total.toLocaleString("en-US").padStart(8)}`)
      console.log(
        `Wrote demo data to ${summary.host} for org(s) ${summary.orgIds.join(", ")}` +
          (summary.shortOfFundsOrgId === null ? "." : `; org ${summary.shortOfFundsOrgId} is left short of funds.`),
      )
    } catch (error) {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    }
  })()
}
