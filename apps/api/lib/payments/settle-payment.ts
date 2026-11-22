import type { Campaign, Prisma } from "@prisma/client"

import { dueNowKes, nairobiDay } from "@workspace/ops-contracts"

import { EDITABLE_STATUSES } from "@/lib/campaigns/campaign-store"
import {
  announceCampaignSubmitted,
  markCampaignSubmitted,
  type SubmittedCampaign,
} from "@/lib/campaigns/submit-campaign"
import { availableKes, lockOrg } from "@/lib/payments/funding"
import {
  notifyPaymentFailed,
  notifyPaymentMismatch,
  notifyPaymentNotApplied,
  notifyPaymentReceived,
} from "@/lib/payments/money-notify"
import { fromSubunit, toSubunit, verifyTransaction, type PaystackTx } from "@/lib/payments/paystack"
import { prisma } from "@/lib/prisma"

export type SettleResult =
  | "settled"
  | "already_settled"
  | "pending"
  | "failed"
  | "abandoned"
  | "amount_mismatch"
  | "unknown_reference"

/** Paystack reports an unpaid checkout as "abandoned" from the moment it is
 * initialised, so a young one is still in progress (M-Pesa gives the payer
 * 180 s; a card payer may take longer). Only call it abandoned after this. */
const ABANDON_AFTER_MS = 30 * 60_000

export function invoiceNumber(paymentId: number, paidAt: Date): string {
  return `INV-${nairobiDay(paidAt).slice(0, 4)}-${String(paymentId).padStart(6, "0")}`
}

/**
 * Funds `campaign` from the org's available balance if it covers the budget.
 * Takes the org lock, so it must run inside a transaction. Re-reads the
 * campaign under the lock so a concurrent submit can't fund it twice.
 */
export async function fundFromBalance(
  tx: Prisma.TransactionClient,
  campaign: Pick<Campaign, "id" | "org_id">,
): Promise<boolean> {
  if (campaign.org_id == null) return false
  await lockOrg(tx, campaign.org_id)
  const current = await tx.campaign.findUniqueOrThrow({
    where: { id: campaign.id },
    select: { funded_at: true, budget_kes: true },
  })
  if (current.funded_at) return true
  if (current.budget_kes == null) return false
  if ((await availableKes(tx, campaign.org_id)) < Number(current.budget_kes)) return false
  await tx.campaign.update({ where: { id: campaign.id }, data: { funded_at: new Date() } })
  return true
}

/** The verified Paystack object minus card/customer PII (spec §11). */
function redact(tx: PaystackTx): Prisma.InputJsonValue {
  const { authorization: _a, customer: _c, ...rest } = tx as PaystackTx & {
    authorization?: unknown
    customer?: unknown
  }
  return rest as Prisma.InputJsonValue
}

type Outcome =
  | { result: Exclude<SettleResult, "settled" | "failed" | "abandoned" | "amount_mismatch">; changed: false }
  | { result: "failed" | "abandoned" | "amount_mismatch"; changed: boolean }
  | {
      result: "settled"
      changed: true
      invoiceNumber: string
      submitted: SubmittedCampaign | null
      /** Still owed to fund the campaign when this payment wasn't enough; null otherwise. */
      shortKes: number | null
      campaign: { id: number; name: string } | null
    }

/**
 * The only function that moves money in (spec §5.3). The webhook, the status
 * poll and the nightly cron all call it; it is safe to call any number of
 * times, concurrently, for the same reference.
 */
export async function settlePayment(reference: string): Promise<SettleResult> {
  const payment = await prisma.payment.findUnique({ where: { reference } })
  if (!payment) return "unknown_reference"
  if (payment.status === "success") return "already_settled"
  if (payment.status === "amount_mismatch") return "amount_mismatch"

  // Verify before taking any lock: an HTTP call must not hold a row lock or
  // run inside the interactive transaction's timeout. Concurrent callers both
  // verify (read-only) and then serialise on the row lock below.
  const ps = await verifyTransaction(reference)

  const outcome: Outcome = await prisma.$transaction(
    async (tx) => {
      const [row] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM payments WHERE reference = ${reference} FOR UPDATE`
      if (!row) return { result: "unknown_reference", changed: false }
      if (row.status === "success") return { result: "already_settled", changed: false }
      if (row.status === "amount_mismatch") return { result: "amount_mismatch", changed: false }

      const abandoned =
        ps.status === "abandoned" && Date.now() - payment.created_at.getTime() > ABANDON_AFTER_MS
      if (ps.status === "failed" || abandoned) {
        const status = ps.status as "failed" | "abandoned"
        if (row.status === status) return { result: status, changed: false }
        await tx.payment.update({
          where: { reference },
          data: { status, failure_reason: ps.gateway_response, raw_event: redact(ps) },
        })
        return { result: status, changed: true }
      }
      if (ps.status !== "success") return { result: "pending", changed: false }

      const amountKes = Number(payment.amount_kes)
      if (ps.currency !== "KES" || ps.amount !== toSubunit(amountKes)) {
        await tx.payment.update({
          where: { reference },
          data: {
            status: "amount_mismatch",
            failure_reason: `Paystack reported ${ps.amount} ${ps.currency}, expected ${toSubunit(amountKes)} KES`,
            raw_event: redact(ps),
          },
        })
        return { result: "amount_mismatch", changed: true }
      }

      const paidAt = ps.paid_at ? new Date(ps.paid_at) : new Date()
      const campaign = payment.campaign_id
        ? await tx.campaign.findUnique({
            where: { id: payment.campaign_id },
            select: { id: true, name: true, org_id: true, status: true },
          })
        : null

      const ledger = await tx.walletTransaction.create({
        data: {
          org_id: payment.org_id,
          campaign_id: campaign?.id ?? null,
          kind: "top_up",
          amount_kes: amountKes,
          provider: "paystack",
          reference,
          description: campaign ? `Payment for campaign #${campaign.id}` : "Account top-up",
          occurred_at: paidAt,
          created_by: null,
        },
      })

      const number = invoiceNumber(payment.id, paidAt)
      const day = new Date(nairobiDay(paidAt))
      await tx.invoice.create({
        data: {
          org_id: payment.org_id,
          campaign_id: campaign?.id ?? null,
          number,
          period_start: day,
          period_end: day,
          issued_on: day,
          due_on: day,
          subtotal_kes: amountKes,
          tax_kes: 0,
          total_kes: amountKes,
          status: "paid",
          paid_at: paidAt,
          lines: [
            {
              description: campaign ? `Campaign #${campaign.id} budget: ${campaign.name}` : "Account top-up",
              amount_kes: amountKes,
            },
          ],
        },
      })

      await tx.payment.update({
        where: { reference },
        data: {
          status: "success",
          channel: ps.channel,
          provider_fee_kes: ps.fees != null ? fromSubunit(ps.fees) : null,
          paid_at: paidAt,
          provider_tx_id: BigInt(ps.id),
          raw_event: redact(ps),
          wallet_transaction_id: ledger.id,
          failure_reason: null,
        },
      })

      let submitted: SubmittedCampaign | null = null
      // Still to pay when the payment wasn't enough to fund the campaign (a balance below zero, or a
      // budget raised after checkout opened). Read under the same lock, so the notice can't disagree.
      let shortKes: number | null = null
      if (campaign && EDITABLE_STATUSES.has(campaign.status)) {
        if (await fundFromBalance(tx, campaign)) {
          submitted = await markCampaignSubmitted(tx, campaign.id)
        } else {
          const { budget_kes } = await tx.campaign.findUniqueOrThrow({ where: { id: campaign.id }, select: { budget_kes: true } })
          shortKes = dueNowKes(Number(budget_kes ?? 0), await availableKes(tx, payment.org_id))
        }
      }

      return {
        result: "settled",
        changed: true,
        invoiceNumber: number,
        submitted,
        shortKes,
        campaign: campaign ? { id: campaign.id, name: campaign.name } : null,
      }
    },
    // The serverless pool has one connection: a concurrent webhook and status
    // poll queue for it, so wait rather than fail at the 2 s default.
    { maxWait: 10_000, timeout: 20_000 },
  )

  if (outcome.changed) {
    const amountKes = Number(payment.amount_kes)
    if (outcome.result === "settled") {
      await notifyPaymentReceived({
        orgId: payment.org_id,
        payerUserId: payment.created_by,
        amountKes,
        channel: ps.channel,
        invoiceNumber: outcome.invoiceNumber,
        campaign: outcome.campaign,
      })
      if (outcome.submitted) {
        await announceCampaignSubmitted(outcome.submitted, { userId: payment.created_by })
      } else if (outcome.campaign) {
        await notifyPaymentNotApplied({ orgId: payment.org_id, amountKes, campaign: outcome.campaign, shortKes: outcome.shortKes })
      }
    } else if (outcome.result === "amount_mismatch") {
      await notifyPaymentMismatch({ orgId: payment.org_id, payerUserId: payment.created_by, reference })
    } else {
      await notifyPaymentFailed({
        orgId: payment.org_id,
        payerUserId: payment.created_by,
        campaign: payment.campaign_id
          ? await prisma.campaign
              .findUnique({ where: { id: payment.campaign_id }, select: { id: true, name: true } })
              .catch(() => null)
          : null,
      })
    }
  }

  return outcome.result
}
