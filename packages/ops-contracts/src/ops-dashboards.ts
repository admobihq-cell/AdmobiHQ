/**
 * Shapes the ops dashboards, finance screens and attention queue return. They live here, not next to
 * the SQL in `@workspace/ops-queries`, so the mobile app can type API responses without importing a
 * database package.
 */
import type { DailyPoint, DateRangeKey, Delta, HealthResult, NamedValue, WalletTransactionKind, measurementLevel } from "./index"

export type ActionQueueItem = {
  title: string
  meta: string
  action: string
  tone: "serious" | "warning" | "neutral"
  count: number
  href: string
}

export type IntegrationDto = {
  id: number
  name: string
  category: string
  purpose: string
  url: string
  plan: string
  cost: number
  currency: string
  billing_cycle: string
  status: string
  owner: string
  notes: string
  updated_at: string
  updated_by_email: string | null
}

export type FinanceOverviewDto = {
  range: DateRangeKey
  window: { start: string; end: string }
  revenue: Delta
  moneyIn: Delta
  payoutsKes: number
  toolCostsKes: number
  /** Paystack fees Admobi absorbed in the period. */
  feesKes: number
  netMarginKes: number
  /** Money owed to advertisers, all-time. Not revenue. */
  fundsHeldKes: number
  hasLedgerRows: boolean
  moneyInOut: { period: string; inKes: number; outKes: number }[]
  revenueByCategory: NamedValue[]
  revenueByMarket: NamedValue[]
}

export type LedgerRowDto = {
  id: number
  occurredAt: string
  orgId: number | null
  orgName: string
  campaignName: string
  kind: WalletTransactionKind
  category: string | null
  amountKes: number
  reference: string | null
  description: string
  provider: string
}

export type FinanceLedgerDto = {
  window: { start: string; end: string }
  rows: LedgerRowDto[]
  /** Totals over the whole window, not just the rows shown. */
  totals: { count: number; topUpsKes: number; spendKes: number; refundsKes: number; netKes: number }
}

export type WalletStatus = "short" | "healthy" | "inactive"

export type WalletRowDto = {
  orgId: number
  orgName: string
  balanceKes: number
  committedKes: number
  availableKes: number
  runwayDays: number | null
  lastTopUpOn: string | null
  status: WalletStatus
}

export type PayoutRowDto = {
  id: number
  driverProfileId: number | null
  driverName: string
  amountKes: number
  status: string
  periodMonth: string
  paidAt: string | null
  mpesaRef: string | null
  provider: string
  method: "mpesa" | "bank" | null
  /** Last 4 digits only: ops never needs the full number on screen. */
  destinationMasked: string | null
  failureReason: string | null
}

export type FinancePayoutsDto = {
  window: { start: string; end: string }
  byStatus: { status: string; count: number; amountKes: number }[]
  byMonth: { period: string; settledKes: number; pendingKes: number; failedKes: number }[]
  rows: PayoutRowDto[]
}

export type AttentionItemDto = {
  kind: "amount_mismatch" | "stale_payment" | "refund" | "payout"
  label: string
  detail: string
  amountKes: number
  at: string
}

export type RecordOptionsDto = {
  orgs: { id: number; name: string }[]
  campaigns: { id: number; name: string; orgId: number }[]
}

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

export type InventoryDto = {
  window: { start: string; end: string }
  includeMoney: boolean
  /** Budget of live and scheduled campaigns by format; null without `finances`. */
  budgetByFormat: NamedValue[] | null
  marketByDaypart: { market: string; daypart: string; value: number | null }[]
  impressionsByMarket: NamedValue[]
  endingSoon: { id: number; name: string; orgName: string; endsOn: string; daysLeft: number; deliveryRate: number | null }[]
}

export type FleetQueueRow = { id: number; name: string; city: string | null; waitingHours: number }

export type FleetMoney = {
  payoutsPendingKes: number
  payoutsByMonth: { period: string; settledKes: number; pendingKes: number; failedKes: number }[]
  topDrivers: NamedValue[]
  failedPayouts: { id: number; driverName: string; amountKes: number; period: string }[]
}

export type FleetDashboardDto = {
  window: { start: string; end: string }
  activeDrivers: number
  totalDrivers: number
  pendingApplications: number
  approvalRate: number | null
  avgActiveVehicles: number | null
  vehicleHours: number
  funnel: { label: string; value: number }[]
  driversByCity: NamedValue[]
  vehiclesTrend: DailyPoint[]
  queue: FleetQueueRow[]
  /** Present only when the viewer holds `finances`. */
  money?: FleetMoney
}

export type OldestCaseRow = {
  id: number
  subject: string
  category: string
  priority: string
  status: string
  orgName: string | null
  ageHours: number
}

export type SafetySummary = {
  openIncidents: number
  criticalIncidents: number
  byType: NamedValue[]
  bySeverity: NamedValue[]
}

export type SupportDashboardDto = {
  window: { start: string; end: string }
  openCases: number
  urgentOpen: number
  openedInRange: number
  casesTrend: DailyPoint[]
  byCategory: NamedValue[]
  oldestOpen: OldestCaseRow[]
  /** Null unless the viewer also holds `safety`. */
  safety: SafetySummary | null
}

export type ToolCostsDto = { monthlyKes: number; activeCount: number; byCategory: NamedValue[] }
