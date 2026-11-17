import { unspentBudgetKes } from "@/lib/payments/funding"
import { alertOpsFinance, notifyCreditReleased } from "@/lib/payments/money-notify"
import { nairobiYesterday, writeDailySpend } from "@/lib/payments/daily-spend"
import { settlePayment, type SettleResult } from "@/lib/payments/settle-payment"
import { reconcileProcessingTransfers } from "@/lib/payments/payouts"
import { reconcileRefunds } from "@/lib/payments/refunds"
import { prisma } from "@/lib/prisma"

const STALE_MINUTES = 60

/** Payments still `initiated` after an hour get verified once more: settled, failed or abandoned. */
export async function reconcileStalePayments(olderThanMinutes = STALE_MINUTES): Promise<Record<SettleResult, number>> {
  const counts: Record<SettleResult, number> = {
    settled: 0, already_settled: 0, pending: 0, failed: 0, abandoned: 0, amount_mismatch: 0, unknown_reference: 0,
  }
  const stale = await prisma.payment.findMany({
    where: { status: "initiated", created_at: { lt: new Date(Date.now() - olderThanMinutes * 60_000) } },
    select: { reference: true },
    take: 200,
  })
  for (const { reference } of stale) {
    try {
      counts[await settlePayment(reference)] += 1
    } catch (error) {
      console.error(`[finance-daily] reconcile ${reference} failed:`, error)
      counts.pending += 1
    }
  }
  return counts
}

/**
 * A6 "finished under budget" for flights that ended yesterday. The money itself
 * is already available: holdsFunds stops holding once the last day passes.
 * ponytail: keyed on "ended yesterday", so a skipped night skips that notice; the money is still correct.
 */
export async function releaseCompletedCredit(today: Date = new Date()): Promise<{ notified: number }> {
  const ended = await prisma.campaign.findMany({
    where: {
      status: "approved",
      funded_at: { not: null },
      ends_on: new Date(nairobiYesterday(today)),
      org_id: { not: null },
      budget_kes: { not: null },
    },
    select: { id: true, name: true, org_id: true, budget_kes: true },
  })
  let notified = 0
  for (const c of ended) {
    const unspent = await unspentBudgetKes(c.id, Number(c.budget_kes))
    if (unspent <= 0) continue
    await notifyCreditReleased({ orgId: c.org_id!, amountKes: unspent, campaign: { id: c.id, name: c.name }, reason: "completed" })
    notified += 1
  }
  return { notified }
}

/** Counts of everything finance needs a human for (also listed on the ops overview). */
export async function financeAttentionCounts() {
  const hourAgo = new Date(Date.now() - STALE_MINUTES * 60_000)
  const [mismatched, stale, refunds, payouts] = await Promise.all([
    prisma.payment.count({ where: { status: "amount_mismatch" } }),
    prisma.payment.count({ where: { status: "initiated", created_at: { lt: hourAgo } } }),
    prisma.refund.count({ where: { status: { in: ["failed", "needs_attention"] } } }),
    prisma.payout.count({ where: { status: { in: ["failed", "reversed"] } } }),
  ])
  return { mismatched, stale, refunds, payouts, total: mismatched + stale + refunds + payouts }
}

/** O7: nightly digest, only when something needs attention. */
export async function sendFinanceDigest(): Promise<{ items: number }> {
  const c = await financeAttentionCounts()
  if (c.total > 0) {
    await alertOpsFinance({
      title: `Finance: ${c.total} items need attention`,
      body: `${c.mismatched} payment amount mismatches, ${c.stale} stale payments, ${c.refunds} refunds and ${c.payouts} driver payouts need attention.`,
      email: true,
    })
  }
  return { items: c.total }
}

/** The nightly run, in order (spec §5.3, §5.4, §8.3). */
export async function runFinanceDaily(today: Date = new Date()) {
  const payments = await reconcileStalePayments()
  const spend = await writeDailySpend(today)
  const credit = await releaseCompletedCredit(today)
  const transfers = await reconcileProcessingTransfers()
  // Refunds made in the Paystack dashboard, or whose webhook never arrived.
  const refunds = await reconcileRefunds().catch((error) => {
    console.error("[finance-daily] refund reconcile failed:", error)
    return { imported: 0 }
  })
  const digest = await sendFinanceDigest()
  return { payments, spend, credit, transfers, refunds, digest }
}
