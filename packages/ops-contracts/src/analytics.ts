import { DATE_RANGE_KEYS, type CampaignFlightPhase, type DateRangeKey } from "./enums"
import type { FundingLevel, HealthResult } from "./health"

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** Kenya time. Stored on `campaign_daily_stats.daypart`. */
export const DAYPARTS = ["morning", "midday", "evening", "night"] as const
export type Daypart = (typeof DAYPARTS)[number]

export const DAYPART_LABELS: Record<Daypart, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  night: "Night",
}

/** A proposed split, not yet confirmed commercially. `tax` is never revenue. */
export const SPEND_CATEGORIES = ["screen_time", "production", "service_fee", "tax"] as const
export type SpendCategory = (typeof SPEND_CATEGORIES)[number]

export const SPEND_CATEGORY_LABELS: Record<SpendCategory, string> = {
  screen_time: "Screen time",
  production: "Production",
  service_fee: "Fees",
  tax: "Tax",
}

export const WALLET_TRANSACTION_KINDS = ["top_up", "spend", "refund", "adjustment"] as const
export type WalletTransactionKind = (typeof WALLET_TRANSACTION_KINDS)[number]

export const INVOICE_STATUSES = ["issued", "paid", "overdue", "void"] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** Values of the `source` column on the stats tables, lowest first. */
export const MEASUREMENT_SOURCES = ["schedule", "logged", "modelled", "calibrated"] as const
export type MeasurementSource = (typeof MEASUREMENT_SOURCES)[number]

/** What a report can claim, lowest first. Booked needs no stats rows at all. */
export const MEASUREMENT_LEVELS = ["booked", "logged", "modelled", "calibrated"] as const
export type MeasurementLevel = (typeof MEASUREMENT_LEVELS)[number]

export const MEASUREMENT_LEVEL_LABELS: Record<MeasurementLevel, string> = {
  booked: "Booked schedule",
  logged: "Logged plays",
  modelled: "Modelled estimate",
  calibrated: "Calibrated estimate",
}

// ---------------------------------------------------------------------------
// Chart shapes
// ---------------------------------------------------------------------------

export type NamedValue = { name: string; value: number }

/** One calendar day of chart data: `day` is YYYY-MM-DD, every other key a series. */
export type DailyPoint = { day: string; [series: string]: string | number | null }

export type HeatCell = { x: string; y: string; value: number | null }

/** `change` is percent change on the previous period; null when there is nothing to compare. */
export type Delta = { current: number; previous: number | null; change: number | null }

export const MAX_CATEGORIES = 5

/** Keeps the largest `max - 1` rows and folds the rest into "Other". */
export function foldOther(rows: NamedValue[], max = MAX_CATEGORIES): NamedValue[] {
  if (rows.length <= max) return [...rows]
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  const kept = sorted.slice(0, max - 1)
  const other = sorted.slice(max - 1).reduce((sum, row) => sum + row.value, 0)
  return [...kept, { name: "Other", value: other }]
}

export function fillDays<K extends string>(
  rows: ({ day: string } & Partial<Record<K, number>>)[],
  start: string,
  end: string,
  keys: readonly K[]
): ({ day: string } & Record<K, number>)[] {
  const byDay = new Map(rows.map((row) => [row.day, row]))
  const out: ({ day: string } & Record<K, number>)[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const row = byDay.get(day)
    const point = { ...row, day } as { day: string } & Record<K, number>
    for (const key of keys) {
      if (typeof point[key] !== "number") (point as Record<string, unknown>)[key] = 0
    }
    out.push(point)
  }
  return out
}

// ---------------------------------------------------------------------------
// Ratios — null whenever the divisor is missing or zero, never NaN or Infinity
// ---------------------------------------------------------------------------

export function rate(part: number | null, whole: number | null): number | null {
  if (part === null || !whole) return null
  return part / whole
}

/** Cost per 1,000 impressions. Pass spend that already excludes `tax` rows. */
export function costPerThousand(
  spendKes: number | null,
  impressions: number | null
): number | null {
  if (spendKes === null || !impressions) return null
  return (spendKes * 1000) / impressions
}

/** Impressions ÷ reach, for one campaign only: reach can't be added across campaigns. */
export function frequency(impressions: number | null, reach: number | null): number | null {
  if (impressions === null || !reach) return null
  return impressions / reach
}

/** Null when every value is null, so missing data never reads as zero. */
export function sumNullable(values: (number | null)[]): number | null {
  let total: number | null = null
  for (const value of values) {
    if (value !== null) total = (total ?? 0) + value
  }
  return total
}

export function delta(current: number, previous: number | null): Delta {
  const change = previous ? ((current - previous) * 100) / Math.abs(previous) : null
  return { current, previous, change }
}

export function measurementLevel(sources: string[]): MeasurementLevel {
  if (sources.length === 0) return "booked"
  let lowest: number = MEASUREMENT_LEVELS.length - 1
  for (const source of sources) {
    // An unknown source counts as booked: never claim more than the rows support.
    const index = Math.max(0, MEASUREMENT_SOURCES.indexOf(source as MeasurementSource))
    lowest = Math.min(lowest, index)
  }
  return MEASUREMENT_LEVELS[lowest] ?? "booked"
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

function roundKes(value: number): number {
  return Math.round(value * 100) / 100
}

/** Whole days of funds at the average daily spend; null with no spending to measure. */
export function runwayDays(availableKes: number, avgDailySpendKes: number): number | null {
  if (avgDailySpendKes <= 0) return null
  return Math.max(0, Math.floor(availableKes / avgDailySpendKes))
}

/** What's left on each budget, floored at 0 so an overspent campaign can't free up funds. */
export function committedKes(campaigns: { budgetKes: number; spentKes: number }[]): number {
  return roundKes(campaigns.reduce((sum, c) => sum + Math.max(0, c.budgetKes - c.spentKes), 0))
}

/** Tool costs are a monthly run-rate, scaled to the range. */
export function netMargin(input: {
  revenueKes: number
  payoutsKes: number
  toolsMonthlyKes: number
  rangeDays: number
}): number {
  return roundKes(
    input.revenueKes - input.payoutsKes - (input.toolsMonthlyKes * input.rangeDays) / 30
  )
}

/**
 * Amounts follow the ledger's sign (credit +, debit −), except `spendKes`,
 * which is the positive amount spent. `closing = opening + topUps − spend +
 * refunds + adjustments`, and each closing is the next month's opening.
 */
export type StatementRow = {
  month: string
  opening: number
  topUpsKes: number
  spendKes: number
  refundsKes: number
  adjustmentsKes: number
  closing: number
}

/** Months come from the ledger, so a month with no rows has no statement. */
export function monthlyStatements(
  rows: { month: string; kind: string; amountKes: number }[]
): StatementRow[] {
  const months = new Map<string, Omit<StatementRow, "opening" | "closing">>()
  for (const row of rows) {
    const m = months.get(row.month) ?? {
      month: row.month,
      topUpsKes: 0,
      spendKes: 0,
      refundsKes: 0,
      adjustmentsKes: 0,
    }
    if (row.kind === "top_up") m.topUpsKes += row.amountKes
    else if (row.kind === "spend") m.spendKes -= row.amountKes
    else if (row.kind === "refund") m.refundsKes += row.amountKes
    else m.adjustmentsKes += row.amountKes
    months.set(row.month, m)
  }

  let opening = 0
  return [...months.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => {
      const row: StatementRow = {
        month: m.month,
        opening,
        topUpsKes: roundKes(m.topUpsKes),
        spendKes: roundKes(m.spendKes),
        refundsKes: roundKes(m.refundsKes),
        adjustmentsKes: roundKes(m.adjustmentsKes),
        closing: roundKes(opening + m.topUpsKes - m.spendKes + m.refundsKes + m.adjustmentsKes),
      }
      opening = row.closing
      return row
    })
}

// ---------------------------------------------------------------------------
// Ranges — Africa/Nairobi calendar days as YYYY-MM-DD strings
// ---------------------------------------------------------------------------

export const ALL_TIME_START = "2020-01-01"
export const MAX_RANGE_DAYS = 366
export const DEFAULT_RANGE: DateRangeKey = "30d"

const PRESET_DAYS: Record<Exclude<DateRangeKey, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 }
const DAY_MS = 86_400_000

export type ReportRange = {
  start: string
  end: string
  /** The same-length window immediately before; null for all time. */
  previous: { start: string; end: string } | null
}

const nairobiFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Nairobi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function nairobiDay(date: Date): string {
  const parts = Object.fromEntries(nairobiFormat.formatToParts(date).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

// UTC arithmetic on the date string, so no timezone or DST shift can skip a day.
function addDays(day: string, n: number): string {
  return new Date(Date.parse(day) + n * DAY_MS).toISOString().slice(0, 10)
}

function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const ms = Date.parse(value)
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value
}

function windowBefore(start: string, days: number): { start: string; end: string } {
  return { start: addDays(start, -days), end: addDays(start, -1) }
}

/**
 * Resolves `range`, or `from` + `to`, into inclusive calendar days. Presets
 * count today as the last day. Throws `RangeError` for an unknown range key, a
 * malformed or reversed custom range, or one longer than 366 days.
 */
export function resolveReportRange(
  input: { range?: string; from?: string; to?: string },
  today: Date
): ReportRange {
  if (input.from !== undefined || input.to !== undefined) {
    const { from, to } = input
    if (!from || !to || !isDay(from) || !isDay(to)) {
      throw new RangeError("from and to must both be dates as YYYY-MM-DD")
    }
    if (from > to) throw new RangeError("from must be on or before to")
    const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1
    if (days > MAX_RANGE_DAYS)
      throw new RangeError(`A range can cover at most ${MAX_RANGE_DAYS} days`)
    return { start: from, end: to, previous: windowBefore(from, days) }
  }

  const range = input.range ?? DEFAULT_RANGE
  if (!(DATE_RANGE_KEYS as readonly string[]).includes(range)) {
    throw new RangeError(`Unknown range: ${range}`)
  }
  const end = nairobiDay(today)
  if (range === "all") return { start: ALL_TIME_START, end, previous: null }

  const days = PRESET_DAYS[range as Exclude<DateRangeKey, "all">]
  const start = addDays(end, -(days - 1))
  return { start, end, previous: windowBefore(start, days) }
}

// ---------------------------------------------------------------------------
// DTOs — a starting shape for the finance and report endpoints.
// ---------------------------------------------------------------------------

export type ImpressionRange = { low: number | null; likely: number | null; high: number | null }

// Finance DTOs: plain `number` money, because every finance endpoint sits behind `billing:read`.

export type UpcomingChargeDto = {
  campaignId: number
  campaignName: string
  startsOn: string
  remainingKes: number
}

export type FinanceSummaryDto = {
  range: ReportRange
  hasLedgerRows: boolean
  /** All-time; ignores the range. */
  balanceKes: number
  committedKes: number
  /** Balance minus committed. Null until the first ledger row. */
  availableKes: number | null
  spentKes: Delta
  topUpsKes: Delta
  spendByCategory: NamedValue[]
  spendByCampaign: NamedValue[]
  moneyInOut: { period: string; inKes: number; outKes: number }[]
  funding: {
    level: FundingLevel
    runwayDays: number | null
    avgDailySpendKes: number
    /** Null when no scheduled campaign has budget left. */
    nextChargeKes: number | null
    nextChargeOn: string | null
  }
  /** Planned spend on scheduled campaigns, not a bill. */
  upcomingCharges: UpcomingChargeDto[]
}

export type TransactionDto = {
  id: number
  occurredAt: string
  kind: WalletTransactionKind
  description: string
  reference: string | null
  campaignId: number | null
  campaignName: string | null
  spendCategory: SpendCategory | null
  amountKes: number
  balanceAfterKes: number
}

export type TransactionPageDto = {
  items: TransactionDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary: {
    topUpsKes: number
    spendKes: number
    refundsKes: number
    netKes: number
  }
}

export type InvoiceLineDto = { description: string; amountKes: number }

export type InvoiceDto = {
  id: number
  number: string
  periodStart: string
  periodEnd: string
  campaignId: number | null
  campaignName: string | null
  subtotalKes: number
  taxKes: number
  totalKes: number
  status: InvoiceStatus
  issuedOn: string
  dueOn: string
  paidAt: string | null
  lines: InvoiceLineDto[]
}

export type StatementRowDto = StatementRow

// Report DTOs: every money field is nullable. It is null without `billing:read`,
// and spend-based values are null under a market or daypart filter, since spend
// is held per campaign.

type ReportBase = {
  range: ReportRange
  /** Lowest level across the rows in view. */
  measurementLevel: MeasurementLevel
  hasDeliveryRows: boolean
}

export type ReportCampaignRowDto = {
  id: number
  name: string
  market: string | null
  format: string | null
  objective: string | null
  status: string
  phase: CampaignFlightPhase | null
  startsOn: string | null
  endsOn: string | null
  budgetKes: number | null
  spentKes: number | null
  playsScheduled: number
  playsDelivered: number
  deliveryRate: number | null
  impressions: ImpressionRange
  costPerThousandKes: number | null
  health: HealthResult
}

export type CreativeRotationRowDto = {
  name: string
  plays: number
  share: number | null
  impressionsLikely: number | null
}

export type ReportOverviewDto = ReportBase & {
  /** Null when no row in view carries an estimate. */
  impressions: (Delta & { low: number | null; high: number | null }) | null
  impressionsTrend: DailyPoint[]
  playsDelivered: Delta
  deliveryRate: Delta | null
  /** Only for a single campaign in view: reach can't be added across campaigns. */
  reachLikely: number | null
  costPerThousandKes: Delta | null
  pacing: { delivered: number; remaining: number; rate: number | null; days: DailyPoint[] }
  whatsWorking: {
    topMarket: NamedValue | null
    topDaypart: NamedValue | null
    topCreative: NamedValue | null
  }
  ledger: {
    atRisk: number
    watch: number
    endingSoon: number
    unspentBudgetKes: number | null
    rows: ReportCampaignRowDto[]
  }
}

export type ReportDeliveryDto = ReportBase & {
  totals: {
    scheduled: number
    delivered: number
    missed: number
    over: number
    vehicleHours: number
    distanceKm: number
  }
  deliveryRate: number | null
  trend: DailyPoint[]
  missedByDaypart: NamedValue[]
  activeVehiclesTrend: DailyPoint[]
  creatives: CreativeRotationRowDto[]
  dailyLog: DailyPoint[]
}

export type ReportAudienceDto = ReportBase & {
  marketByDaypart: HeatCell[]
  byMarket: (NamedValue & { change: number | null })[]
  weekdayByDaypart: HeatCell[]
  daypartShare: NamedValue[]
  /** Campaign-to-date, one campaign only. */
  reach: (ImpressionRange & { frequency: number | null; asOf: string }) | null
  marketImpressions: NamedValue[]
}

export type ReportSpendDto = ReportBase & {
  spentKes: Delta | null
  costPerThousandKes: number | null
  budgetKes: number | null
  budgetUsed: number | null
  unspentKes: number | null
  costPerThousandTrend: DailyPoint[]
  byCampaign: NamedValue[] | null
  byObjective: NamedValue[] | null
  byFormat: NamedValue[] | null
  burn: {
    campaignId: number
    name: string
    budgetUsed: number | null
    flightElapsed: number | null
  }[]
}

export type CampaignReportDto = {
  range: ReportRange
  measurementLevel: MeasurementLevel
  hasDeliveryRows: boolean
  campaign: ReportCampaignRowDto
  flightElapsed: number | null
  kpis: {
    impressions: ImpressionRange
    reach: ImpressionRange | null
    frequency: number | null
    playsDelivered: number
    deliveryRate: number | null
    costPerThousandKes: number | null
  }
  pacing: DailyPoint[]
  marketByDaypart: HeatCell[]
  marketImpressions: NamedValue[]
  creatives: CreativeRotationRowDto[]
  dailyLog: DailyPoint[]
  budget: { budgetKes: number | null; spentKes: number | null; remainingKes: number | null }
}
