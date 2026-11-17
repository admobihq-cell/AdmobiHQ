import { randomBytes } from "node:crypto"

import { availableKes, lockOrg } from "@/lib/payments/funding"
import { notifyRefundUpdate } from "@/lib/payments/money-notify"
import { createRefund, fromSubunit, listRefunds, PaystackError, verifyTransaction, type PaystackRefund } from "@/lib/payments/paystack"
import { prisma } from "@/lib/prisma"

const roundKes = (value: number) => Math.round(value * 100) / 100

type RefundablePayment = { id: number; reference: string; amountKes: number; refundedKes: number; paidAt: Date }

/** Spread a refund over the newest payments first, never past what any one payment has left. */
export function allocateRefund(
  amountKes: number,
  payments: RefundablePayment[],
): { paymentId: number; reference: string; amountKes: number }[] {
  let remainingCents = Math.round(amountKes * 100)
  const slices: { paymentId: number; reference: string; amountKes: number }[] = []
  for (const p of [...payments].sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())) {
    if (remainingCents <= 0) break
    const leftCents = Math.round(p.amountKes * 100) - Math.round(p.refundedKes * 100)
    if (leftCents <= 0) continue
    const take = Math.min(leftCents, remainingCents)
    slices.push({ paymentId: p.id, reference: p.reference, amountKes: take / 100 })
    remainingCents -= take
  }
  if (remainingCents > 0) throw new RangeError("Not enough refundable Paystack payments for this amount")
  return slices
}

const refundMethod = (channel: string | null): "mpesa" | "card" | "other" =>
  channel === "mobile_money" ? "mpesa" : channel === "card" ? "card" : "other"

/** 4xx that prove Paystack did NOT create the refund. 408/429 and 5xx/network are "unknown". */
const isDefiniteRejection = (error: unknown) =>
  error instanceof PaystackError && [400, 401, 403, 404, 422].includes(error.status)

/** A refund that will never complete: give the money back to the balance, once. */
async function failRefund(refundId: number, reason: string): Promise<boolean> {
  const changed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refund.updateMany({
      where: { id: refundId, status: { in: ["pending", "processing", "needs_attention"] } },
      data: { status: "failed" },
    })
    if (!count) return false
    const refund = await tx.refund.findUniqueOrThrow({ where: { id: refundId } })
    await tx.walletTransaction.createMany({
      data: [
        {
          org_id: refund.org_id,
          kind: "adjustment",
          amount_kes: refund.amount_kes,
          provider: "paystack",
          reference: `${refund.reference}-reversal`,
          description: `Refund ${refund.reference} failed: ${reason}`.slice(0, 500),
          occurred_at: new Date(),
        },
      ],
      skipDuplicates: true,
    })
    return true
  })
  return changed
}

async function markNeedsAttention(refundId: number): Promise<boolean> {
  const { count } = await prisma.refund.updateMany({
    where: { id: refundId, status: { in: ["pending", "processing"] } },
    data: { status: "needs_attention" },
  })
  return count > 0
}

async function refundNotice(refundId: number, stage: "sent" | "processed" | "delayed") {
  const r = await prisma.refund.findUnique({ where: { id: refundId }, include: { payment: true } })
  if (!r) return
  await notifyRefundUpdate({
    orgId: r.org_id,
    amountKes: Number(r.amount_kes),
    method: refundMethod(r.payment.channel),
    stage,
    payerUserId: r.payment.created_by,
  })
}

/**
 * Ops refunds unused credit to the original Paystack payments (spec §5.5). The
 * `cash_refund` rows are written before calling Paystack, under the org lock,
 * so the same credit can never be refunded or spent twice.
 */
export async function refundCredit(input: {
  orgId: number
  amountKes: number
  reason: string
  opsEmail: string
}): Promise<{ refundIds: number[] }> {
  const amountKes = roundKes(input.amountKes)
  if (!(amountKes > 0)) throw new RangeError("Refund amount must be positive")

  const slices = await prisma.$transaction(
    async (tx) => {
      await lockOrg(tx, input.orgId)
      if ((await availableKes(tx, input.orgId)) < amountKes) {
        throw new RangeError("Refund is larger than the available balance")
      }
      const payments = await tx.payment.findMany({
        where: { org_id: input.orgId, status: "success", provider: "paystack", paid_at: { not: null } },
        include: { refunds: { where: { status: { not: "failed" } }, select: { amount_kes: true } } },
      })
      const allocation = allocateRefund(
        amountKes,
        payments.map((p) => ({
          id: p.id,
          reference: p.reference,
          amountKes: Number(p.amount_kes),
          refundedKes: p.refunds.reduce((sum, r) => sum + Number(r.amount_kes), 0),
          paidAt: p.paid_at!,
        })),
      )

      const created: { id: number; reference: string; paymentReference: string; amountKes: number }[] = []
      for (const slice of allocation) {
        const draft = await tx.refund.create({
          data: {
            payment_id: slice.paymentId,
            org_id: input.orgId,
            amount_kes: slice.amountKes,
            reference: `adm-refund-tmp-${randomBytes(6).toString("hex")}`,
            reason: input.reason,
            created_by_email: input.opsEmail,
          },
        })
        const reference = `adm-refund-${draft.id}`
        const ledger = await tx.walletTransaction.create({
          data: {
            org_id: input.orgId,
            kind: "cash_refund",
            amount_kes: -slice.amountKes,
            provider: "paystack",
            reference,
            description: `Refund to payer (${slice.reference}): ${input.reason}`.slice(0, 500),
            occurred_at: new Date(),
          },
        })
        await tx.refund.update({ where: { id: draft.id }, data: { reference, wallet_transaction_id: ledger.id } })
        created.push({ id: draft.id, reference, paymentReference: slice.reference, amountKes: slice.amountKes })
      }
      return created
    },
    { maxWait: 10_000, timeout: 20_000 },
  )

  let sent = 0
  for (const slice of slices) {
    try {
      const result = await createRefund({
        transactionReference: slice.paymentReference,
        amountKes: slice.amountKes,
        reference: slice.reference,
        merchantNote: input.reason,
      })
      await prisma.refund.update({
        where: { id: slice.id },
        data: {
          provider_refund_id: String(result.id),
          status: result.status === "processed" ? "processed" : "processing",
        },
      })
      sent += 1
    } catch (error) {
      console.error(`[refunds] Paystack refund ${slice.reference} failed:`, error)
      const changed = isDefiniteRejection(error)
        ? await failRefund(slice.id, error instanceof Error ? error.message : "rejected by Paystack")
        : await markNeedsAttention(slice.id)
      if (changed) await refundNotice(slice.id, "delayed")
    }
  }

  // A8 once per request, not once per slice.
  if (sent > 0) {
    const first = await prisma.refund.findUniqueOrThrow({ where: { id: slices[0]!.id }, include: { payment: true } })
    await notifyRefundUpdate({
      orgId: input.orgId,
      amountKes,
      method: refundMethod(first.payment.channel),
      stage: "sent",
      payerUserId: first.payment.created_by,
    })
  }

  return { refundIds: slices.map((s) => s.id) }
}

type PaymentForSync = { id: number; org_id: number; reference: string; provider_tx_id: bigint | null; created_by: string }

/**
 * Bring our rows for one payment in line with Paystack's refund list. A refund we already
 * know is matched by Paystack id, or by the `adm-refund-N` reference in its merchant note.
 * One we don't know was made in the Paystack dashboard: it is imported as a Refund plus a
 * `cash_refund` debit, so the advertiser can no longer spend money that went back to them.
 * Idempotent: the `ps-refund-<id>` reference is unique on both tables.
 */
export async function applyPaystackRefunds(payment: PaymentForSync, items: PaystackRefund[]): Promise<{ imported: number }> {
  let imported = 0
  for (const item of items) {
    const providerId = String(item.id)
    const noteRef = item.merchant_note?.match(/^(adm-refund-\d+):/)?.[1]
    let row =
      (await prisma.refund.findFirst({ where: { provider_refund_id: providerId } })) ??
      (noteRef ? await prisma.refund.findUnique({ where: { reference: noteRef } }) : null)

    if (row && !row.provider_refund_id) {
      row = await prisma.refund.update({ where: { id: row.id }, data: { provider_refund_id: providerId } })
    }
    if (!row) {
      // A refund Paystack never sent moved no money: nothing to import.
      if (item.status === "failed") continue
      const reference = `ps-refund-${item.id}`
      const amountKes = fromSubunit(item.amount)
      const created = await prisma.$transaction(async (tx) => {
        await lockOrg(tx, payment.org_id)
        if (await tx.refund.findUnique({ where: { reference } })) return null
        // One of our own refunds on this payment has no Paystack id yet (webhook raced the save, or
        // createRefund timed out). This item may be that refund, so importing it could debit twice.
        // Leave it: the row stays in Needs attention for a human.
        const unmatched = await tx.refund.count({
          where: { payment_id: payment.id, provider_refund_id: null, status: { not: "failed" } },
        })
        if (unmatched > 0) {
          console.warn(`[refunds] not importing Paystack refund ${item.id}: ${payment.reference} has an unmatched refund of ours`)
          return null
        }
        const ledger = await tx.walletTransaction.create({
          data: {
            org_id: payment.org_id,
            kind: "cash_refund",
            amount_kes: -amountKes,
            provider: "paystack",
            reference,
            description: `Refund to your original payment method (${payment.reference})`,
            occurred_at: new Date(),
          },
        })
        return tx.refund.create({
          data: {
            payment_id: payment.id,
            org_id: payment.org_id,
            amount_kes: amountKes,
            status: "processing",
            reference,
            provider_refund_id: providerId,
            wallet_transaction_id: ledger.id,
            reason: "Made in the Paystack dashboard",
            created_by_email: item.refunded_by || "paystack-dashboard",
          },
        })
      })
      if (!created) continue
      row = created
      imported += 1
      await refundNotice(row.id, "sent")
    }

    switch (item.status) {
      case "processed": {
        const { count } = await prisma.refund.updateMany({
          where: { id: row.id, status: { in: ["pending", "processing", "needs_attention"] } },
          data: { status: "processed" },
        })
        if (count) await refundNotice(row.id, "processed")
        break
      }
      case "failed":
        if (await failRefund(row.id, "Paystack reported the refund failed")) await refundNotice(row.id, "delayed")
        break
      case "needs-attention":
        if (await markNeedsAttention(row.id)) await refundNotice(row.id, "delayed")
        break
      default:
        await prisma.refund.updateMany({ where: { id: row.id, status: "pending" }, data: { status: "processing" } })
    }
  }
  return { imported }
}

/**
 * refund.* webhooks. The payload carries only the transaction reference, amount and status
 * (no refund id, no merchant note), so it is a trigger: re-read that payment's refunds from
 * Paystack and apply them. Each notice fires only when our row's status actually changed.
 */
export async function handleRefundEvent(event: string, data: { transaction_reference?: string }): Promise<void> {
  const payment = data.transaction_reference
    ? await prisma.payment.findUnique({ where: { reference: data.transaction_reference } })
    : null
  if (!payment) {
    console.warn(`[refunds] ${event} for a payment we don't have (${data.transaction_reference ?? "no reference"})`)
    return
  }
  const txId = payment.provider_tx_id ?? BigInt((await verifyTransaction(payment.reference)).id)
  await applyPaystackRefunds(payment, await listRefunds({ transactionId: txId }))
}

/** Nightly: every Paystack refund of the last `days` days, so a missed webhook still lands. */
export async function reconcileRefunds(days = 30): Promise<{ imported: number }> {
  const items = await listRefunds({ from: new Date(Date.now() - days * 86_400_000).toISOString() })
  const byTx = new Map<string, PaystackRefund[]>()
  for (const r of items) byTx.set(String(r.transaction), [...(byTx.get(String(r.transaction)) ?? []), r])
  const payments = await prisma.payment.findMany({
    where: { provider_tx_id: { in: [...byTx.keys()].map((id) => BigInt(id)) } },
  })
  let imported = 0
  for (const p of payments) {
    try {
      imported += (await applyPaystackRefunds(p, byTx.get(String(p.provider_tx_id)) ?? [])).imported
    } catch (error) {
      console.error(`[refunds] reconcile ${p.reference} failed:`, error)
    }
  }
  return { imported }
}
