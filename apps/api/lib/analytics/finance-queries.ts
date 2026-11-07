import { Prisma } from "@prisma/client"

import {
  campaignFlightPhase,
  committedKes,
  delta,
  foldOther,
  fundingStatus,
  monthlyStatements,
  runwayDays,
  SPEND_CATEGORY_LABELS,
  type FinanceSummaryDto,
  type InvoiceDto,
  type InvoiceLineDto,
  type InvoiceStatus,
  type NamedValue,
  type ReportRange,
  type SpendCategory,
  type StatementRowDto,
  type TransactionDto,
  type TransactionPageDto,
  type UpcomingChargeDto,
  type WalletTransactionKind,
} from "@workspace/ops-contracts"

import { isActive } from "@/lib/campaigns/campaign-statement"
import { prisma } from "@/lib/prisma"

/**
 * Org-scoped money queries behind /v1/customer/finance/*. Every query filters on the caller's
 * orgId. A transaction is joined to its campaign only when the campaign belongs to the same
 * org, so a row that points at another org's campaign still counts for this org but never
 * reveals that campaign's name.
 *
 * `occurred_at` is TIMESTAMP(3) without a zone and holds UTC, so a calendar day in Nairobi
 * needs both conversions. A single `AT TIME ZONE 'Africa/Nairobi'` would shift rows by 3 hours.
 */
export const LEDGER_DAY = Prisma.sql`(occurred_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date`

export const ledgerInRange = (start: string, end: string) =>
  Prisma.sql`${LEDGER_DAY} BETWEEN ${start}::date AND ${end}::date`

const THIRTY_DAYS = 30
const roundKes = (value: number) => Math.round(value * 100) / 100
const num = (value: unknown) => (value == null ? 0 : Number(value))

type Totals = { spent: number; topUps: number }

/** Spent is spend net of refunds, as a positive number. */
async function periodTotals(orgId: number, start: string, end: string): Promise<Totals> {
  const [row] = await prisma.$queryRaw<{ spent: number | null; top_ups: number | null }[]>`
    SELECT
      (-COALESCE(SUM(amount_kes) FILTER (WHERE kind IN ('spend', 'refund')), 0))::float8 AS spent,
      COALESCE(SUM(amount_kes) FILTER (WHERE kind = 'top_up'), 0)::float8 AS top_ups
    FROM wallet_transactions
    WHERE org_id = ${orgId} AND ${ledgerInRange(start, end)}`
  return { spent: roundKes(num(row?.spent)), topUps: roundKes(num(row?.top_ups)) }
}

export async function getFinanceSummary(
  orgId: number,
  range: ReportRange,
  today = new Date()
): Promise<FinanceSummaryDto> {
  const trailingEnd = range.end
  const [ledger, current, previous, byCategory, byCampaign, inOut, campaigns, spentByCampaign, trailing] =
    await Promise.all([
      prisma.$queryRaw<{ balance: number | null; rows: number }[]>`
        SELECT COALESCE(SUM(amount_kes), 0)::float8 AS balance, COUNT(*)::int AS rows
        FROM wallet_transactions WHERE org_id = ${orgId}`,
      periodTotals(orgId, range.start, range.end),
      range.previous ? periodTotals(orgId, range.previous.start, range.previous.end) : null,
      prisma.$queryRaw<{ category: string | null; spent: number }[]>`
        SELECT spend_category AS category, (-SUM(amount_kes))::float8 AS spent
        FROM wallet_transactions
        WHERE org_id = ${orgId} AND kind IN ('spend', 'refund') AND ${ledgerInRange(range.start, range.end)}
        GROUP BY spend_category HAVING -SUM(amount_kes) <> 0
        ORDER BY 2 DESC`,
      prisma.$queryRaw<{ name: string | null; spent: number }[]>`
        SELECT c.name AS name, (-SUM(t.amount_kes))::float8 AS spent
        FROM wallet_transactions t
        LEFT JOIN campaigns c ON c.id = t.campaign_id AND c.org_id = t.org_id
        WHERE t.org_id = ${orgId} AND t.kind IN ('spend', 'refund')
          AND ${ledgerInRange(range.start, range.end)}
        GROUP BY c.name HAVING -SUM(t.amount_kes) <> 0
        ORDER BY 2 DESC`,
      prisma.$queryRaw<{ period: string; in_kes: number; out_kes: number }[]>`
        SELECT to_char(${LEDGER_DAY}, 'YYYY-MM') AS period,
          COALESCE(SUM(amount_kes) FILTER (WHERE kind = 'top_up'), 0)::float8 AS in_kes,
          (-COALESCE(SUM(amount_kes) FILTER (WHERE kind IN ('spend', 'refund')), 0))::float8 AS out_kes
        FROM wallet_transactions
        WHERE org_id = ${orgId} AND ${ledgerInRange(range.start, range.end)}
        GROUP BY 1 ORDER BY 1`,
      prisma.campaign.findMany({ where: { org_id: orgId } }),
      prisma.$queryRaw<{ campaign_id: number; spent: number }[]>`
        SELECT campaign_id, (-SUM(amount_kes))::float8 AS spent
        FROM wallet_transactions
        WHERE org_id = ${orgId} AND campaign_id IS NOT NULL AND kind IN ('spend', 'refund')
        GROUP BY campaign_id`,
      // Trailing 30 days, independent of the range, so runway doesn't swing with the picker.
      prisma.$queryRaw<{ spent: number | null }[]>`
        SELECT (-COALESCE(SUM(amount_kes), 0))::float8 AS spent
        FROM wallet_transactions
        WHERE org_id = ${orgId} AND kind IN ('spend', 'refund')
          AND ${LEDGER_DAY} > ${trailingEnd}::date - ${THIRTY_DAYS}::int`,
    ])

  const balanceKes = roundKes(num(ledger[0]?.balance))
  const hasLedgerRows = num(ledger[0]?.rows) > 0

  const spentMap = new Map(spentByCampaign.map((r) => [r.campaign_id, num(r.spent)]))
  const remaining = (budget: unknown, id: number) => Math.max(0, num(budget) - (spentMap.get(id) ?? 0))

  const committed = committedKes(
    campaigns
      .filter((c) => isActive(c, today))
      .map((c) => ({ budgetKes: num(c.budget_kes), spentKes: spentMap.get(c.id) ?? 0 }))
  )

  const upcomingCharges: UpcomingChargeDto[] = campaigns
    .filter(
      (c) =>
        c.starts_on &&
        c.budget_kes != null &&
        campaignFlightPhase(c.status, c.starts_on, c.ends_on, today) === "scheduled" &&
        remaining(c.budget_kes, c.id) > 0
    )
    .map((c) => ({
      campaignId: c.id,
      campaignName: c.name,
      startsOn: c.starts_on!.toISOString().slice(0, 10),
      remainingKes: roundKes(remaining(c.budget_kes, c.id)),
    }))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))

  const availableKes = hasLedgerRows ? roundKes(balanceKes - committed) : null
  const avgDailySpendKes = roundKes(num(trailing[0]?.spent) / THIRTY_DAYS)
  const runway = availableKes === null ? null : runwayDays(availableKes, avgDailySpendKes)
  const funding = fundingStatus({
    hasLedgerRows,
    availableKes: availableKes ?? 0,
    runwayDays: runway,
  })

  return {
    range,
    hasLedgerRows,
    balanceKes,
    committedKes: committed,
    availableKes,
    spentKes: delta(current.spent, previous ? previous.spent : null),
    topUpsKes: delta(current.topUps, previous ? previous.topUps : null),
    spendByCategory: byCategory.map(
      (r): NamedValue => ({
        name: r.category ? (SPEND_CATEGORY_LABELS[r.category as SpendCategory] ?? r.category) : "Uncategorised",
        value: roundKes(num(r.spent)),
      })
    ),
    spendByCampaign: foldOther(
      byCampaign.map((r) => ({ name: r.name ?? "Unassigned", value: roundKes(num(r.spent)) }))
    ),
    moneyInOut: inOut.map((r) => ({
      period: r.period,
      inKes: roundKes(num(r.in_kes)),
      outKes: roundKes(num(r.out_kes)),
    })),
    funding: {
      level: funding.level,
      runwayDays: runway,
      avgDailySpendKes,
      nextChargeKes: upcomingCharges[0]?.remainingKes ?? null,
      nextChargeOn: upcomingCharges[0]?.startsOn ?? null,
    },
    upcomingCharges,
  }
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const TRANSACTION_PAGE_SIZE = 25

// Whitelist: the value is interpolated as raw SQL, so it must never come from the request.
const SORTS = {
  date_desc: "occurred_at DESC, id DESC",
  date_asc: "occurred_at ASC, id ASC",
  amount_desc: "amount_kes DESC, id DESC",
  amount_asc: "amount_kes ASC, id ASC",
} as const
export type TransactionSort = keyof typeof SORTS
export const TRANSACTION_SORTS = Object.keys(SORTS) as TransactionSort[]

export type TransactionQuery = {
  range?: { start: string; end: string }
  kind?: WalletTransactionKind
  q?: string
  page?: number
  sort?: TransactionSort
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

type LedgerRow = {
  id: number
  occurred_at: Date
  kind: WalletTransactionKind
  description: string
  reference: string | null
  campaign_id: number | null
  campaign_name: string | null
  spend_category: SpendCategory | null
  amount_kes: number
  balance_after: number
}

/**
 * One page of the ledger, or every filtered row with `all`. Balance after is a running sum
 * over the org's whole ledger, computed before filtering and paging, so it is right on any page.
 */
export async function listTransactions(
  orgId: number,
  query: TransactionQuery,
  options: { all?: boolean } = {}
): Promise<TransactionPageDto> {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = TRANSACTION_PAGE_SIZE

  const conditions: Prisma.Sql[] = []
  if (query.range) conditions.push(ledgerInRange(query.range.start, query.range.end))
  if (query.kind) conditions.push(Prisma.sql`kind = ${query.kind}`)
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`
    conditions.push(
      Prisma.sql`(description ILIKE ${pattern} OR reference ILIKE ${pattern} OR campaign_name ILIKE ${pattern})`
    )
  }
  const where = conditions.length ? Prisma.join(conditions, " AND ") : Prisma.sql`TRUE`

  const base = Prisma.sql`
    WITH ledger AS (
      SELECT t.id, t.occurred_at, t.kind, t.description, t.reference, t.campaign_id,
             c.name AS campaign_name, t.spend_category, t.amount_kes,
             SUM(t.amount_kes) OVER (ORDER BY t.occurred_at, t.id) AS balance_after
      FROM wallet_transactions t
      LEFT JOIN campaigns c ON c.id = t.campaign_id AND c.org_id = t.org_id
      WHERE t.org_id = ${orgId}
    ), filtered AS (SELECT * FROM ledger WHERE ${where})`

  const order = Prisma.raw(SORTS[query.sort ?? "date_desc"])
  const paging = options.all ? Prisma.empty : Prisma.sql`LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`

  const [rows, [summary]] = await Promise.all([
    prisma.$queryRaw<LedgerRow[]>`
      ${base}
      SELECT id, occurred_at, kind, description, reference, campaign_id, campaign_name, spend_category,
             amount_kes::float8 AS amount_kes, balance_after::float8 AS balance_after
      FROM filtered ORDER BY ${order} ${paging}`,
    prisma.$queryRaw<
      { total: number; top_ups: number; spend: number; refunds: number; net: number }[]
    >`
      ${base}
      SELECT COUNT(*)::int AS total,
        COALESCE(SUM(amount_kes) FILTER (WHERE kind = 'top_up'), 0)::float8 AS top_ups,
        (-COALESCE(SUM(amount_kes) FILTER (WHERE kind = 'spend'), 0))::float8 AS spend,
        COALESCE(SUM(amount_kes) FILTER (WHERE kind = 'refund'), 0)::float8 AS refunds,
        COALESCE(SUM(amount_kes), 0)::float8 AS net
      FROM filtered`,
  ])

  const total = num(summary?.total)
  return {
    items: rows.map(
      (r): TransactionDto => ({
        id: r.id,
        occurredAt: new Date(r.occurred_at).toISOString(),
        kind: r.kind,
        description: r.description,
        reference: r.reference,
        campaignId: r.campaign_name === null ? null : r.campaign_id,
        campaignName: r.campaign_name,
        spendCategory: r.spend_category,
        amountKes: roundKes(num(r.amount_kes)),
        balanceAfterKes: roundKes(num(r.balance_after)),
      })
    ),
    total,
    page: options.all ? 1 : page,
    pageSize: options.all ? Math.max(total, 1) : pageSize,
    totalPages: options.all ? 1 : Math.max(1, Math.ceil(total / pageSize)),
    summary: {
      topUpsKes: roundKes(num(summary?.top_ups)),
      spendKes: roundKes(num(summary?.spend)),
      refundsKes: roundKes(num(summary?.refunds)),
      netKes: roundKes(num(summary?.net)),
    },
  }
}

// ---------------------------------------------------------------------------
// Invoices and statements
// ---------------------------------------------------------------------------

const day = (date: Date) => date.toISOString().slice(0, 10)

type InvoiceRecord = Prisma.InvoiceGetPayload<{
  include: { campaign: { select: { name: true; org_id: true } } }
}>

function toInvoiceDto(orgId: number, invoice: InvoiceRecord): InvoiceDto {
  const lines = Array.isArray(invoice.lines) ? (invoice.lines as InvoiceLineDto[]) : []
  const ownCampaign = invoice.campaign && invoice.campaign.org_id === orgId ? invoice.campaign : null
  return {
    id: invoice.id,
    number: invoice.number,
    periodStart: day(invoice.period_start),
    periodEnd: day(invoice.period_end),
    campaignId: ownCampaign ? invoice.campaign_id : null,
    campaignName: ownCampaign?.name ?? null,
    subtotalKes: roundKes(num(invoice.subtotal_kes)),
    taxKes: roundKes(num(invoice.tax_kes)),
    totalKes: roundKes(num(invoice.total_kes)),
    status: invoice.status as InvoiceStatus,
    issuedOn: day(invoice.issued_on),
    dueOn: day(invoice.due_on),
    paidAt: invoice.paid_at?.toISOString() ?? null,
    lines: lines.map((l) => ({ description: String(l.description), amountKes: roundKes(num(l.amountKes)) })),
  }
}

const INVOICE_INCLUDE = { campaign: { select: { name: true, org_id: true } } } as const

export async function listInvoices(orgId: number): Promise<InvoiceDto[]> {
  const invoices = await prisma.invoice.findMany({
    where: { org_id: orgId },
    orderBy: [{ issued_on: "desc" }, { id: "desc" }],
    include: INVOICE_INCLUDE,
  })
  return invoices.map((i) => toInvoiceDto(orgId, i))
}

/** Null for an unknown id and for another org's invoice alike. */
export async function getInvoice(orgId: number, id: number): Promise<InvoiceDto | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id, org_id: orgId },
    include: INVOICE_INCLUDE,
  })
  return invoice ? toInvoiceDto(orgId, invoice) : null
}

/** Oldest month first. Each closing is the next month's opening; the last closing is the balance. */
export async function listStatements(orgId: number): Promise<StatementRowDto[]> {
  const rows = await prisma.$queryRaw<{ month: string; kind: string; amount: number }[]>`
    SELECT to_char(${LEDGER_DAY}, 'YYYY-MM') AS month, kind, SUM(amount_kes)::float8 AS amount
    FROM wallet_transactions WHERE org_id = ${orgId}
    GROUP BY 1, 2`
  return monthlyStatements(rows.map((r) => ({ month: r.month, kind: r.kind, amountKes: num(r.amount) })))
}

/** First and last calendar day of a YYYY-MM month. */
export function monthBounds(month: string): { start: string; end: string } {
  const [year, m] = month.split("-").map(Number) as [number, number]
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` }
}
