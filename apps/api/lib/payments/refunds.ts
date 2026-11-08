import { randomBytes } from "node:crypto"

import { availableKes, lockOrg } from "@/lib/payments/funding"
import { notifyRefundUpdate } from "@/lib/payments/money-notify"
import { createRefund, PaystackError } from "@/lib/payments/paystack"
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

/** refund.* webhooks. Each notice fires only when our row's status actually changed. */
export async function handleRefundEvent(
  event: string,
  data: { id?: number | string; status?: string; transaction_reference?: string; merchant_note?: string },
): Promise<void> {
  const byProviderId = data.id != null ? await prisma.refund.findFirst({ where: { provider_refund_id: String(data.id) } }) : null
  // Webhook can beat our own update of provider_refund_id: fall back to the reference in merchant_note.
  const noteRef = data.merchant_note?.match(/^(adm-refund-\d+):/)?.[1]
  const refund = byProviderId ?? (noteRef ? await prisma.refund.findUnique({ where: { reference: noteRef } }) : null)
  if (!refund) {
    console.warn(`[refunds] ${event} for an unknown refund (${data.id ?? "no id"})`)
    return
  }

  switch (event) {
    case "refund.processed": {
      const { count } = await prisma.refund.updateMany({
        where: { id: refund.id, status: { in: ["pending", "processing", "needs_attention"] } },
        data: { status: "processed" },
      })
      if (count) await refundNotice(refund.id, "processed")
      return
    }
    case "refund.failed":
      if (await failRefund(refund.id, "Paystack reported the refund failed")) await refundNotice(refund.id, "delayed")
      return
    case "refund.needs-attention":
      if (await markNeedsAttention(refund.id)) await refundNotice(refund.id, "delayed")
      return
    default:
      // refund.pending / refund.processing: accepted, nothing to tell anyone.
      await prisma.refund.updateMany({ where: { id: refund.id, status: "pending" }, data: { status: "processing" } })
  }
}
