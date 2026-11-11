import {
  DELETED_ORG,
  INACTIVE_AFTER_DAYS,
  NO_CAMPAIGN,
  type FinanceOverviewDto,
  type FinanceLedgerDto,
  type WalletRowDto,
  type FinancePayoutsDto,
  type AttentionItemDto,
  type RecordOptionsDto,
  SPEND_CATEGORY_LABELS,
  delta,
  foldOther,
  fundingStatus,
  netMargin,
  nairobiDay,
  resolveReportRange,
  runwayDays,
  type DateRangeKey,
  type NamedValue,
  type ReportRange,
  type SpendCategory,
  type WalletTransactionKind,
} from "@workspace/ops-contracts"
import { monthlyUsd, USD_KES } from "@workspace/ops-contracts/integration-costs"
import { num, rowsOf, type Db } from "./db"
import { queryIntegrations } from "./integrations"


/**
 * Ops finance, read straight from the ledger with raw SQL. Callers must already have checked the
 * `finances` permission: every figure here is money. Cached per tab for five minutes.
 *
 * Conventions: `occurred_at` is a UTC timestamp, so a Nairobi calendar day needs both zone
 * conversions. Revenue is spend net of refunds with `tax` rows left out. Funds held is money
 * owed to advertisers, not revenue, and is always all-time. SQL sums stay numeric/float8 and
 * are converted to numbers once, here.
 */

const DAY = `(t.occurred_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date`
const IN_RANGE = `${DAY} BETWEEN $1::date AND $2::date`
const roundKes = (value: number) => Math.round(value * 100) / 100
const DAY_MS = 86_400_000

function windows(range: DateRangeKey): ReportRange {
  return resolveReportRange({ range }, new Date())
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

type PeriodTotals = { revenue: number; moneyIn: number }

async function periodTotals(db: Db, start: string, end: string): Promise<PeriodTotals> {
  const rows = rowsOf(db)
  const [row] = await rows<{ revenue: number; money_in: number }>(
    `SELECT
       (-COALESCE(SUM(t.amount_kes) FILTER (WHERE t.kind IN ('spend', 'refund') AND t.spend_category IS DISTINCT FROM 'tax'), 0))::float8 AS revenue,
       COALESCE(SUM(t.amount_kes) FILTER (WHERE t.kind = 'top_up'), 0)::float8 AS money_in
     FROM wallet_transactions t WHERE t.org_id IS NOT NULL AND ${IN_RANGE}`,
    [start, end]
  )
  return { revenue: roundKes(num(row?.revenue)), moneyIn: roundKes(num(row?.money_in)) }
}

async function settledPayouts(db: Db, start: string, end: string): Promise<number> {
  const rows = rowsOf(db)
  const [row] = await rows<{ total: number }>(
    `SELECT COALESCE(SUM(amount_kes), 0)::float8 AS total
     FROM payouts t
     WHERE status = 'settled' AND paid_at IS NOT NULL
       AND (t.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date BETWEEN $1::date AND $2::date`,
    [start, end]
  )
  return roundKes(num(row?.total))
}

/** Paystack fees absorbed in the period: collection fees on payments plus transfer fees on payouts. */
async function providerFees(db: Db, start: string, end: string): Promise<number> {
  const rows = rowsOf(db)
  const [row] = await rows<{ total: number }>(
    `SELECT (
       COALESCE((SELECT SUM(provider_fee_kes) FROM payments
                 WHERE status = 'success' AND (paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date BETWEEN $1::date AND $2::date), 0)
     + COALESCE((SELECT SUM(fee_kes) FROM payouts
                 WHERE status = 'settled' AND (paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date BETWEEN $1::date AND $2::date), 0)
     )::float8 AS total`,
    [start, end]
  )
  return roundKes(num(row?.total))
}

/** Monthly run-rate of paid-for tools in KES. Only active and trial lines count. */
export async function toolMonthlyKes(db: Db): Promise<{ monthlyKes: number; activeCount: number; byCategory: NamedValue[] }> {
  const live = (await queryIntegrations(db)).filter((i) => i.status === "active" || i.status === "trial")
  const byCategory = new Map<string, number>()
  let monthlyUsdTotal = 0
  for (const i of live) {
    const usd = monthlyUsd(i)
    monthlyUsdTotal += usd
    if (usd > 0) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + usd * USD_KES)
  }
  return {
    monthlyKes: roundKes(monthlyUsdTotal * USD_KES),
    activeCount: live.length,
    byCategory: [...byCategory].map(([name, value]) => ({ name, value: roundKes(value) })).sort((a, b) => b.value - a.value),
  }
}


export async function queryFinanceOverview(db: Db, range: DateRangeKey): Promise<FinanceOverviewDto> {
  const rows = rowsOf(db)
  const w = windows(range)
  const [cur, prev, payouts, held, byMonth, byCategory, byMarket, tools, first, fees] = await Promise.all([
    periodTotals(db, w.start, w.end),
    w.previous ? periodTotals(db, w.previous.start, w.previous.end) : Promise.resolve(null),
    settledPayouts(db, w.start, w.end),
    rows<{ held: number; n: number }>(
      `SELECT COALESCE(SUM(amount_kes), 0)::float8 AS held, COUNT(*)::int AS n FROM wallet_transactions WHERE org_id IS NOT NULL`,
      []
    ),
    rows<{ period: string; in_kes: number; out_kes: number }>(
      `SELECT to_char(${DAY}, 'YYYY-MM') AS period,
         COALESCE(SUM(t.amount_kes) FILTER (WHERE t.kind = 'top_up'), 0)::float8 AS in_kes,
         (-COALESCE(SUM(t.amount_kes) FILTER (WHERE t.kind IN ('spend', 'refund', 'cash_refund')), 0))::float8 AS out_kes
       FROM wallet_transactions t WHERE t.org_id IS NOT NULL AND ${IN_RANGE} GROUP BY 1 ORDER BY 1`,
      [w.start, w.end]
    ),
    rows<{ category: string | null; value: number }>(
      `SELECT t.spend_category AS category, (-SUM(t.amount_kes))::float8 AS value
       FROM wallet_transactions t
       WHERE t.org_id IS NOT NULL AND t.kind IN ('spend', 'refund') AND t.spend_category IS DISTINCT FROM 'tax' AND ${IN_RANGE}
       GROUP BY 1 HAVING -SUM(t.amount_kes) <> 0 ORDER BY 2 DESC`,
      [w.start, w.end]
    ),
    rows<{ market: string | null; value: number }>(
      `SELECT c.market AS market, (-SUM(t.amount_kes))::float8 AS value
       FROM wallet_transactions t LEFT JOIN campaigns c ON c.id = t.campaign_id
       WHERE t.org_id IS NOT NULL AND t.kind IN ('spend', 'refund') AND t.spend_category IS DISTINCT FROM 'tax' AND ${IN_RANGE}
       GROUP BY 1 HAVING -SUM(t.amount_kes) <> 0 ORDER BY 2 DESC`,
      [w.start, w.end]
    ),
    toolMonthlyKes(db),
    // The first ledger day, so an "all time" margin scales tool costs over the months that had a ledger.
    rows<{ first: string | null }>(`SELECT MIN(${DAY})::text AS first FROM wallet_transactions t WHERE t.org_id IS NOT NULL`, []),
    providerFees(db, w.start, w.end),
  ])

  const startDay = w.start === "2020-01-01" ? (first[0]?.first ?? w.end) : w.start
  const rangeDays = Math.max(1, Math.round((Date.parse(w.end) - Date.parse(startDay)) / DAY_MS) + 1)
  const toolCostsKes = roundKes((tools.monthlyKes * rangeDays) / 30)

  return {
    range,
    window: { start: startDay, end: w.end },
    revenue: delta(cur.revenue, prev ? prev.revenue : null),
    moneyIn: delta(cur.moneyIn, prev ? prev.moneyIn : null),
    payoutsKes: payouts,
    toolCostsKes,
    feesKes: fees,
    netMarginKes: netMargin({ revenueKes: cur.revenue, payoutsKes: payouts, toolsMonthlyKes: tools.monthlyKes, rangeDays, feesKes: fees }),
    fundsHeldKes: roundKes(num(held[0]?.held)),
    hasLedgerRows: num(held[0]?.n) > 0,
    moneyInOut: byMonth.map((r) => ({ period: r.period, inKes: roundKes(num(r.in_kes)), outKes: roundKes(num(r.out_kes)) })),
    revenueByCategory: byCategory.map((r) => ({
      name: r.category ? (SPEND_CATEGORY_LABELS[r.category as SpendCategory] ?? r.category) : "Uncategorised",
      value: roundKes(num(r.value)),
    })),
    revenueByMarket: foldOther(byMarket.map((r) => ({ name: r.market ?? "Not set", value: roundKes(num(r.value)) }))),
  }
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------


export const LEDGER_ROW_LIMIT = 300


export async function queryFinanceLedger(db: Db, range: DateRangeKey): Promise<FinanceLedgerDto> {
  const rows = rowsOf(db)
  const w = windows(range)
  const [list, totals] = await Promise.all([
    rows<{
      id: number; occurred_at: Date; org_id: number | null; org_name: string | null; campaign_name: string | null
      kind: WalletTransactionKind; spend_category: string | null; amount_kes: number
      reference: string | null; description: string; provider: string
    }>(
      `SELECT t.id, t.occurred_at, t.org_id, o.name AS org_name, c.name AS campaign_name, t.kind, t.spend_category,
              t.amount_kes::float8 AS amount_kes, t.reference, t.description, t.provider
       FROM wallet_transactions t
       LEFT JOIN advertiser_orgs o ON o.id = t.org_id
       LEFT JOIN campaigns c ON c.id = t.campaign_id
       WHERE ${IN_RANGE}
       ORDER BY t.occurred_at DESC, t.id DESC LIMIT ${LEDGER_ROW_LIMIT}`,
      [w.start, w.end]
    ),
    rows<{ n: number; top_ups: number; spend: number; refunds: number; net: number }>(
      `SELECT COUNT(*)::int AS n,
         COALESCE(SUM(t.amount_kes) FILTER (WHERE t.kind = 'top_up'), 0)::float8 AS top_ups,
         (-COALESCE(SUM(t.amount_kes) FILTER (WHERE t.kind = 'spend'), 0))::float8 AS spend,
         COALESCE(SUM(t.amount_kes) FILTER (WHERE t.kind = 'refund'), 0)::float8 AS refunds,
         COALESCE(SUM(t.amount_kes), 0)::float8 AS net
       FROM wallet_transactions t WHERE ${IN_RANGE}`,
      [w.start, w.end]
    ),
  ])
  const t = totals[0]
  return {
    window: { start: w.start, end: w.end },
    rows: list.map((r) => ({
      id: r.id,
      occurredAt: new Date(r.occurred_at).toISOString(),
      orgId: r.org_id,
      orgName: r.org_name ?? DELETED_ORG,
      campaignName: r.campaign_name ?? NO_CAMPAIGN,
      kind: r.kind,
      category: r.spend_category ? (SPEND_CATEGORY_LABELS[r.spend_category as SpendCategory] ?? r.spend_category) : null,
      amountKes: roundKes(num(r.amount_kes)),
      reference: r.reference,
      description: r.description,
      provider: r.provider,
    })),
    totals: {
      count: num(t?.n),
      topUpsKes: roundKes(num(t?.top_ups)),
      spendKes: roundKes(num(t?.spend)),
      refundsKes: roundKes(num(t?.refunds)),
      netKes: roundKes(num(t?.net)),
    },
  }
}

// ---------------------------------------------------------------------------
// Wallets
// ---------------------------------------------------------------------------



export async function queryFinanceWallets(db: Db): Promise<WalletRowDto[]> {
  const rows = rowsOf(db)
  const today = nairobiDay(new Date())
  const list = await rows<{
    org_id: number; org_name: string; balance: number; committed: number
    last_top_up: string | null; last_tx: string; avg_daily: number
  }>(
    `WITH spent AS (
       SELECT campaign_id, -SUM(amount_kes) AS spent FROM wallet_transactions
       WHERE kind IN ('spend', 'refund') AND campaign_id IS NOT NULL GROUP BY campaign_id
     ), committed AS (
       SELECT c.org_id, SUM(GREATEST(0, COALESCE(c.budget_kes, 0) - COALESCE(s.spent, 0))) AS left_kes
       FROM campaigns c LEFT JOIN spent s ON s.campaign_id = c.id
       WHERE c.status = 'approved' AND c.org_id IS NOT NULL AND c.starts_on IS NOT NULL AND c.ends_on >= $1::date
       GROUP BY c.org_id
     )
     SELECT o.id AS org_id, o.name AS org_name,
            COALESCE(SUM(t.amount_kes), 0)::float8 AS balance,
            COALESCE(MAX(k.left_kes), 0)::float8 AS committed,
            to_char(MAX(${DAY}) FILTER (WHERE t.kind = 'top_up'), 'YYYY-MM-DD') AS last_top_up,
            to_char(MAX(${DAY}), 'YYYY-MM-DD') AS last_tx,
            (-COALESCE(SUM(t.amount_kes) FILTER (WHERE t.kind IN ('spend', 'refund') AND ${DAY} > $1::date - 30), 0) / 30)::float8 AS avg_daily
     FROM advertiser_orgs o
     JOIN wallet_transactions t ON t.org_id = o.id
     LEFT JOIN committed k ON k.org_id = o.id
     GROUP BY o.id, o.name
     ORDER BY o.name`,
    [today]
  )

  return list.map((r): WalletRowDto => {
    const balance = roundKes(num(r.balance))
    const committed = roundKes(num(r.committed))
    const available = roundKes(balance - committed)
    const runway = runwayDays(available, num(r.avg_daily))
    const idleDays = Math.round((Date.parse(today) - Date.parse(r.last_tx)) / DAY_MS)
    const level = fundingStatus({ hasLedgerRows: true, availableKes: available, runwayDays: runway }).level
    return {
      orgId: r.org_id,
      orgName: r.org_name,
      balanceKes: balance,
      committedKes: committed,
      availableKes: available,
      runwayDays: runway,
      lastTopUpOn: r.last_top_up,
      status: idleDays > INACTIVE_AFTER_DAYS ? "inactive" : level === "short" ? "short" : "healthy",
    }
  })
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------



export const maskDestination = (value: string | null) =>
  value && value.length >= 4 ? `•••• ${value.slice(-4)}` : value ? "••••" : null

export async function queryFinancePayouts(db: Db, range: DateRangeKey): Promise<FinancePayoutsDto> {
  const rows = rowsOf(db)
  const w = windows(range)
  // Payouts belong to a month, so the window rounds out to whole months.
  const where = `p.period_month >= date_trunc('month', $1::date) AND p.period_month <= $2::date`
  const [byStatus, byMonth, list] = await Promise.all([
    rows<{ status: string; n: number; amount: number }>(
      `SELECT p.status, COUNT(*)::int AS n, COALESCE(SUM(p.amount_kes), 0)::float8 AS amount
       FROM payouts p WHERE ${where} GROUP BY 1`,
      [w.start, w.end]
    ),
    rows<{ period: string; settled: number; pending: number; failed: number }>(
      `SELECT to_char(p.period_month, 'YYYY-MM') AS period,
         COALESCE(SUM(p.amount_kes) FILTER (WHERE p.status = 'settled'), 0)::float8 AS settled,
         COALESCE(SUM(p.amount_kes) FILTER (WHERE p.status = 'pending'), 0)::float8 AS pending,
         COALESCE(SUM(p.amount_kes) FILTER (WHERE p.status = 'failed'), 0)::float8 AS failed
       FROM payouts p WHERE ${where} GROUP BY 1 ORDER BY 1`,
      [w.start, w.end]
    ),
    rows<{
      id: number; driver_profile_id: number | null; driver_name: string | null; amount: number; status: string; period: string
      paid_at: Date | null; mpesa_ref: string | null; provider: string; method: string | null; destination: string | null
      failure_reason: string | null
    }>(
      `SELECT p.id, p.driver_profile_id, COALESCE(dp.full_name, d.name) AS driver_name, p.amount_kes::float8 AS amount, p.status,
              to_char(p.period_month, 'YYYY-MM') AS period, p.paid_at, p.mpesa_ref, p.provider, dp.payout_method AS method,
              CASE dp.payout_method WHEN 'mpesa' THEN dp.payout_mpesa_msisdn WHEN 'bank' THEN dp.payout_bank_account END AS destination,
              p.failure_reason
       FROM payouts p
       LEFT JOIN driver_profiles dp ON dp.id = p.driver_profile_id
       LEFT JOIN drivers d ON d.id = p.driver_id
       WHERE ${where} ORDER BY p.period_month DESC, p.id DESC LIMIT ${LEDGER_ROW_LIMIT}`,
      [w.start, w.end]
    ),
  ])
  return {
    window: { start: w.start, end: w.end },
    byStatus: byStatus.map((r) => ({ status: r.status, count: num(r.n), amountKes: roundKes(num(r.amount)) })),
    byMonth: byMonth.map((r) => ({
      period: r.period,
      settledKes: roundKes(num(r.settled)),
      pendingKes: roundKes(num(r.pending)),
      failedKes: roundKes(num(r.failed)),
    })),
    rows: list.map((r) => ({
      id: r.id,
      driverProfileId: r.driver_profile_id,
      driverName: r.driver_name ?? "Removed driver",
      amountKes: roundKes(num(r.amount)),
      status: r.status,
      periodMonth: r.period,
      paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
      mpesaRef: r.mpesa_ref,
      provider: r.provider,
      method: r.method === "mpesa" || r.method === "bank" ? r.method : null,
      destinationMasked: maskDestination(r.destination),
      failureReason: r.failure_reason,
    })),
  }
}

// ---------------------------------------------------------------------------
// Payment health: what finance needs a human for
// ---------------------------------------------------------------------------


/** Same four buckets as the nightly finance digest (apps/api lib/payments/finance-daily.ts). */
export async function queryPaymentsNeedingAttention(db: Db): Promise<AttentionItemDto[]> {
  const rows = rowsOf(db)
  const list = await rows<{ kind: AttentionItemDto["kind"]; label: string; detail: string; amount: number; at: Date }>(
    `SELECT * FROM (
       SELECT 'amount_mismatch' AS kind, 'Payment amount mismatch' AS label,
              p.reference || ' · ' || COALESCE(o.name, 'org #' || p.org_id) AS detail, p.amount_kes::float8 AS amount, p.updated_at AS at
       FROM payments p LEFT JOIN advertiser_orgs o ON o.id = p.org_id WHERE p.status = 'amount_mismatch'
       UNION ALL
       SELECT 'stale_payment', 'Payment still pending',
              p.reference || ' · ' || COALESCE(o.name, 'org #' || p.org_id), p.amount_kes::float8, p.created_at
       FROM payments p LEFT JOIN advertiser_orgs o ON o.id = p.org_id
       WHERE p.status = 'initiated' AND p.created_at < now() - interval '1 hour'
       UNION ALL
       SELECT 'refund', CASE r.status WHEN 'failed' THEN 'Refund failed' ELSE 'Refund needs attention' END,
              r.reference || ' · ' || COALESCE(o.name, 'org #' || r.org_id), r.amount_kes::float8, r.updated_at
       FROM refunds r LEFT JOIN advertiser_orgs o ON o.id = r.org_id WHERE r.status IN ('failed', 'needs_attention')
       UNION ALL
       SELECT 'payout', CASE p.status WHEN 'reversed' THEN 'Payout reversed' ELSE 'Payout failed' END,
              COALESCE(dp.full_name, d.name, 'Driver') || COALESCE(' · ' || p.failure_reason, ''), p.amount_kes::float8, p.updated_at
       FROM payouts p LEFT JOIN driver_profiles dp ON dp.id = p.driver_profile_id LEFT JOIN drivers d ON d.id = p.driver_id
       WHERE p.status IN ('failed', 'reversed')
     ) x ORDER BY at DESC LIMIT 50`,
    []
  )
  return list.map((r) => ({
    kind: r.kind,
    label: r.label,
    detail: r.detail,
    amountKes: roundKes(num(r.amount)),
    at: new Date(r.at).toISOString(),
  }))
}

// ---------------------------------------------------------------------------
// Options for the Record transaction dialog
// ---------------------------------------------------------------------------


export async function queryRecordOptions(db: Db): Promise<RecordOptionsDto> {
  const rows = rowsOf(db)
  const [orgs, campaigns] = await Promise.all([
    rows<{ id: number; name: string }>(`SELECT id, name FROM advertiser_orgs ORDER BY name`, []),
    rows<{ id: number; name: string; org_id: number }>(
      `SELECT id, name, org_id FROM campaigns
       WHERE org_id IS NOT NULL AND status NOT IN ('draft', 'cancelled') ORDER BY created_at DESC LIMIT 1000`,
      []
    ),
  ])
  return { orgs, campaigns: campaigns.map((c) => ({ id: c.id, name: c.name, orgId: c.org_id })) }
}

// ---------------------------------------------------------------------------
// Cached entry points, one per tab
// ---------------------------------------------------------------------------

/** Tagged so recording a transaction can expire every finance read at once (see finances/actions.ts). */

/** Settled payments nobody in ops has opened the ledger for yet: the Finances nav badge. */
export async function countUnseenPayments(db: Db): Promise<number> {
  const rows = rowsOf(db)
  return num(
    (await rows<{ n: number }>(`SELECT COUNT(*)::int AS n FROM payments WHERE status = 'success' AND ops_seen_at IS NULL`, []))[0]?.n
  )
}

/** Stamps every unseen settled payment as seen; returns how many it stamped. */
export async function markPaymentsSeen(db: Db): Promise<number> {
  const res = await db.query(`UPDATE payments SET ops_seen_at = now() WHERE status = 'success' AND ops_seen_at IS NULL`)
  return res.rowCount ?? 0
}
