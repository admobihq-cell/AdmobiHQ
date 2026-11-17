import type {
  AdmobiMatch,
  PaystackDisputeDto,
  PaystackPageDto,
  PaystackRefundDto,
  PaystackResource,
  PaystackRowDto,
  PaystackSettlementDto,
  PaystackSummaryDto,
  PaystackTransactionDto,
  PaystackTransferDto,
} from "@workspace/ops-contracts"

import { fromSubunit, getKesBalance, paystackGet, paystackPage, type PaystackMeta } from "@/lib/payments/paystack"
import { prisma } from "@/lib/prisma"

/**
 * Live Paystack data for the ops Finances → Paystack tab. Every row is mapped to a short
 * DTO: Paystack's own objects carry reusable card authorization codes, signatures, IPs and
 * full customer records, none of which may leave the api.
 */

export type PaystackListQuery = {
  page: number
  perPage: number
  from?: string
  to?: string
  status?: string
  /** Transactions only: an exact reference (Paystack has no free-text search). */
  reference?: string
  /** Transactions only: the payer's email, resolved to a Paystack customer. */
  email?: string
}

type Obj = Record<string, unknown>
const str = (v: unknown) => (typeof v === "string" && v ? v : null)
const num = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v))
const kes = (v: unknown) => fromSubunit(num(v) ?? 0)
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Obj) : {})

function qs(q: PaystackListQuery, extra: Record<string, string | undefined> = {}) {
  const p = new URLSearchParams({ perPage: String(q.perPage), page: String(q.page) })
  for (const [k, v] of Object.entries({ from: q.from, to: q.to, ...extra })) if (v) p.set(k, v)
  return p.toString()
}

const pageOf = <T>(rows: T[], meta: PaystackMeta, q: PaystackListQuery): PaystackPageDto<T> => ({
  rows,
  page: meta.page ?? q.page,
  pageCount: Math.max(1, meta.pageCount ?? 1),
  total: meta.total ?? rows.length,
})

/** Our Payment rows (and their org names) for a set of Paystack references. */
async function paymentsByReference(references: string[]) {
  const payments = references.length
    ? await prisma.payment.findMany({
        where: { reference: { in: references } },
        select: { reference: true, status: true, org_id: true, org: { select: { name: true } } },
      })
    : []
  return new Map(payments.map((p) => [p.reference, p]))
}

/** credited: our row is settled. not_credited: Paystack took the money but we never credited it. */
export function admobiMatch(paystackStatus: string, ours: { status: string } | undefined): AdmobiMatch {
  if (!ours) return "not_ours"
  return paystackStatus === "success" && ours.status !== "success" ? "not_credited" : "credited"
}

async function transactions(q: PaystackListQuery): Promise<PaystackPageDto<PaystackTransactionDto>> {
  let items: Obj[]
  let meta: PaystackMeta
  if (q.reference) {
    const one = await paystackGet<Obj>(`/transaction/verify/${encodeURIComponent(q.reference)}`).catch(() => null)
    items = one ? [one] : []
    meta = { page: 1, pageCount: 1, total: items.length }
  } else {
    let customer: string | undefined
    if (q.email) {
      const c = await paystackGet<Obj>(`/customer/${encodeURIComponent(q.email)}`).catch(() => null)
      if (!c) return { rows: [], page: 1, pageCount: 1, total: 0 }
      customer = String(c.id)
    }
    ;({ data: items, meta } = await paystackPage<Obj>(`/transaction?${qs(q, { status: q.status, customer })}`))
  }

  const ours = await paymentsByReference(items.map((t) => String(t.reference)))
  const rows = items.map((t): PaystackTransactionDto => {
    const reference = String(t.reference)
    const mine = ours.get(reference)
    const status = String(t.status)
    return {
      id: Number(t.id),
      reference,
      status,
      amountKes: kes(t.amount),
      feesKes: num(t.fees) == null ? null : kes(t.fees),
      channel: str(t.channel),
      paidAt: str(t.paid_at) ?? str(t.paidAt),
      createdAt: String(t.created_at ?? t.createdAt ?? ""),
      email: str(obj(t.customer).email),
      gatewayResponse: str(t.gateway_response),
      match: admobiMatch(status, mine),
      orgId: mine?.org_id ?? null,
      orgName: mine?.org?.name ?? null,
    }
  })
  return pageOf(rows, meta, q)
}

async function settlements(q: PaystackListQuery): Promise<PaystackPageDto<PaystackSettlementDto>> {
  const { data, meta } = await paystackPage<Obj>(`/settlement?${qs(q, { status: q.status })}`)
  const rows = data.map((s): PaystackSettlementDto => {
    const total = kes(s.total_amount)
    const fees = kes(s.total_fees)
    return {
      id: Number(s.id),
      status: String(s.status ?? "unknown"),
      totalKes: total,
      feesKes: fees,
      netKes: num(s.effective_amount) == null ? total - fees : kes(s.effective_amount),
      settledAt: str(s.settlement_date) ?? str(s.settled_at),
      createdAt: str(s.createdAt) ?? str(s.created_at),
    }
  })
  return pageOf(rows, meta, q)
}

async function transfers(q: PaystackListQuery): Promise<PaystackPageDto<PaystackTransferDto>> {
  const { data, meta } = await paystackPage<Obj>(`/transfer?${qs(q, { status: q.status })}`)
  const refs = data.map((t) => str(t.reference)).filter((r): r is string => r != null)
  const payouts = refs.length
    ? await prisma.payout.findMany({ where: { reference: { in: refs } }, select: { id: true, reference: true } })
    : []
  const byRef = new Map(payouts.map((p) => [p.reference, p.id]))
  const rows = data.map((t): PaystackTransferDto => {
    const reference = str(t.reference)
    return {
      id: Number(t.id),
      reference,
      status: String(t.status ?? "unknown"),
      amountKes: kes(t.amount),
      recipientName: str(obj(t.recipient).name),
      reason: str(t.reason),
      createdAt: str(t.createdAt) ?? str(t.created_at),
      payoutId: (reference && byRef.get(reference)) || null,
    }
  })
  return pageOf(rows, meta, q)
}

async function refunds(q: PaystackListQuery): Promise<PaystackPageDto<PaystackRefundDto>> {
  const { data, meta } = await paystackPage<Obj>(`/refund?${qs(q)}`)
  const recorded = new Set(
    (
      await prisma.refund.findMany({
        where: { provider_refund_id: { in: data.map((r) => String(r.id)) } },
        select: { provider_refund_id: true },
      })
    ).map((r) => r.provider_refund_id),
  )
  const txRef = (r: Obj) => str(r.transaction_reference) ?? str(obj(r.transaction).reference)
  const ours = await paymentsByReference(data.map(txRef).filter((r): r is string => r != null))
  const rows = data.map((r): PaystackRefundDto => {
    const transactionReference = txRef(r)
    const mine = transactionReference ? ours.get(transactionReference) : undefined
    return {
      id: Number(r.id),
      transactionReference,
      amountKes: kes(r.amount),
      status: String(r.status ?? "unknown"),
      refundedBy: str(r.refunded_by),
      note: str(r.merchant_note),
      createdAt: str(r.createdAt) ?? str(r.created_at),
      recorded: recorded.has(String(r.id)),
      orgId: mine?.org_id ?? null,
      orgName: mine?.org?.name ?? null,
    }
  })
  return pageOf(rows, meta, q)
}

async function disputes(q: PaystackListQuery): Promise<PaystackPageDto<PaystackDisputeDto>> {
  const { data, meta } = await paystackPage<Obj>(`/dispute?${qs(q, { status: q.status })}`)
  const rows = data.map((d): PaystackDisputeDto => ({
    id: Number(d.id),
    status: String(d.status ?? "unknown"),
    amountKes: kes(d.refund_amount ?? obj(d.transaction).amount),
    transactionReference: str(obj(d.transaction).reference),
    category: str(d.category),
    resolution: str(d.resolution),
    dueAt: str(d.dueAt) ?? str(d.due_at),
    createdAt: str(d.createdAt) ?? str(d.created_at),
  }))
  return pageOf(rows, meta, q)
}

const LISTS: { [R in PaystackResource]: (q: PaystackListQuery) => Promise<PaystackPageDto<PaystackRowDto[R]>> } = {
  transactions,
  settlements,
  transfers,
  refunds,
  disputes,
}

export const listPaystack = <R extends PaystackResource>(resource: R, q: PaystackListQuery) => LISTS[resource](q)

/** The tab's headline numbers. `pending_transfers` is Paystack's "collected, not yet settled". */
export async function paystackSummary(from?: string, to?: string): Promise<PaystackSummaryDto> {
  const p = new URLSearchParams()
  if (from) p.set("from", from)
  if (to) p.set("to", to)
  // Waiting-to-settle is all time; volume follows the range.
  const [balanceKes, totals, allTime] = await Promise.all([
    getKesBalance(),
    paystackGet<Obj>(`/transaction/totals?${p}`),
    p.size ? paystackGet<Obj>("/transaction/totals") : null,
  ])
  const inKes = (list: unknown, fallback: unknown) =>
    kes((Array.isArray(list) ? (list as Obj[]).find((c) => c.currency === "KES")?.amount : undefined) ?? fallback)
  const pending = allTime ?? totals
  return {
    balanceKes,
    waitingToSettleKes: inKes(pending.pending_transfers_by_currency, pending.pending_transfers),
    volumeKes: inKes(totals.total_volume_by_currency, totals.total_volume),
    transactionCount: num(totals.total_transactions) ?? 0,
  }
}
