import { randomBytes } from "node:crypto"

import type { PaymentStatus } from "@workspace/ops-contracts"

import { getCustomerEmail } from "@/lib/customer/customer-clerk"
import { initializeTransaction } from "@/lib/payments/paystack"
import { invoiceNumber, settlePayment } from "@/lib/payments/settle-payment"
import { prisma } from "@/lib/prisma"

/** Paystack's KES minimum. A smaller "due" is rounded up; the extra is credit. */
export const PAYSTACK_MIN_KES = 3
const REUSE_WINDOW_MS = 30 * 60_000
/** The return page polls this; after 20 s we stop waiting for the webhook and ask Paystack. */
const SELF_VERIFY_AFTER_MS = 20_000

export class CheckoutConfigError extends Error {}

const newReference = () => `adm-pay-${randomBytes(6).toString("hex")}`

/** Paystack needs an email. Prefer the payer's Clerk address, then the org's billing address. */
export async function payerEmail(userId: string, orgId: number): Promise<string | null> {
  const own = await getCustomerEmail(userId)
  if (own) return own
  const org = await prisma.advertiserOrg.findUnique({ where: { id: orgId }, select: { billing_email: true } })
  return org?.billing_email?.trim() || null
}

/**
 * Starts (or reuses) a hosted Paystack checkout. The amount is always computed
 * by the caller from our own rows — never taken from the request for a campaign.
 */
export async function startCheckout(input: {
  orgId: number
  campaignId: number | null
  amountKes: number
  userId: string
  email: string
}): Promise<{ authorizationUrl: string; reference: string; amountKes: number }> {
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL?.trim()
  if (!callbackUrl || !/^https?:\/\//.test(callbackUrl)) throw new CheckoutConfigError("PAYSTACK_CALLBACK_URL is not set")

  const amountKes = Math.max(PAYSTACK_MIN_KES, Math.round(input.amountKes * 100) / 100)

  // Double click / second tab: hand back the checkout already open.
  const existing = await prisma.payment.findFirst({
    where: {
      org_id: input.orgId,
      campaign_id: input.campaignId,
      amount_kes: amountKes,
      status: "initiated",
      created_at: { gte: new Date(Date.now() - REUSE_WINDOW_MS) },
    },
    orderBy: { created_at: "desc" },
  })
  const existingUrl = (existing?.raw_event as { authorization_url?: string } | null)?.authorization_url
  if (existing && existingUrl) {
    return { authorizationUrl: existingUrl, reference: existing.reference, amountKes }
  }

  const reference = newReference()
  const payment = await prisma.payment.create({
    data: {
      org_id: input.orgId,
      campaign_id: input.campaignId,
      reference,
      amount_kes: amountKes,
      created_by: input.userId,
    },
  })

  try {
    const { authorizationUrl, accessCode } = await initializeTransaction({
      email: input.email,
      amountKes,
      reference,
      callbackUrl,
      metadata: { payment_reference: reference, org_id: input.orgId, campaign_id: input.campaignId },
      channels: ["mobile_money", "card"],
    })
    // Kept until settlement overwrites raw_event with the verified transaction,
    // so a reused checkout can send the payer back to the same page.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { raw_event: { authorization_url: authorizationUrl, access_code: accessCode } },
    })
    return { authorizationUrl, reference, amountKes }
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed", failure_reason: "Paystack initialize failed" },
    })
    throw error
  }
}

export type PaymentStatusView = {
  status: PaymentStatus | "pending"
  amountKes: number
  campaignId: number | null
  invoiceId: number | null
}

/** Org-scoped status for the return page. Asks Paystack itself once the webhook is late. */
export async function refreshPayment(reference: string, orgId: number): Promise<PaymentStatusView | null> {
  let payment = await prisma.payment.findFirst({ where: { reference, org_id: orgId } })
  if (!payment) return null

  if (payment.status === "initiated" && Date.now() - payment.created_at.getTime() > SELF_VERIFY_AFTER_MS) {
    try {
      await settlePayment(reference)
    } catch (error) {
      // Paystack unreachable: report pending and let the next poll retry.
      console.error("[payments] status refresh failed:", error)
    }
    payment = (await prisma.payment.findFirst({ where: { reference, org_id: orgId } })) ?? payment
  }

  const invoice =
    payment.status === "success" && payment.paid_at
      ? await prisma.invoice.findUnique({
          where: { number: invoiceNumber(payment.id, payment.paid_at) },
          select: { id: true },
        })
      : null

  return {
    status: payment.status === "initiated" ? "pending" : (payment.status as PaymentStatus),
    amountKes: Number(payment.amount_kes),
    campaignId: payment.campaign_id,
    invoiceId: invoice?.id ?? null,
  }
}
