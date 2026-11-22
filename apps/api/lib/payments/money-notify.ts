/**
 * Every money notice (spec §6.1, IDs A1–A10, O2–O7, D1–D3) goes through here.
 * Callers invoke these only after a status UPDATE actually changed a row, and
 * after commit. Each function swallows and logs its own errors: a dead push
 * token or a Resend outage must never undo or fail a money mutation.
 */
import {
  listOrgMemberIdsWithPermission,
  notifyCustomerUsers,
} from "@/lib/advertiser/advertiser-notify"
import { getCustomerEmail } from "@/lib/customer/customer-clerk"
import { getDriverEmail } from "@/lib/driver/driver-clerk"
import { renderTemplate } from "@/lib/email/render-template"
import { sendAdminEmail, sendEmail } from "@/lib/email/send-email"
import { MoneyUpdate } from "@/lib/email/templates/MoneyUpdate"
import { PaymentReceipt, formatKes } from "@/lib/email/templates/PaymentReceipt"
import { prisma } from "@/lib/prisma"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"
import { notifyUserPush } from "@/lib/push/user-push"
import { liveChannel, publishLive } from "@/lib/realtime"

type CampaignRef = { id: number; name: string }

const BILLING_HREF = "/billing"
const OPS_FINANCES_HREF = "/(ops)/finances"
const DRIVER_EARNINGS_HREF = "/earnings"

async function safely(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (error) {
    console.error(`[money-notify] ${label} failed:`, error)
  }
}

const kes = (amount: number) => `KES ${formatKes(amount)}`

function channelLabel(channel: string | null): string {
  if (channel === "mobile_money") return "M-Pesa"
  if (channel === "card") return "Card"
  if (channel === "bank_transfer" || channel === "bank") return "Bank transfer"
  return channel ?? "Paystack"
}

/** Payer + org billing address, deduplicated case-insensitively. */
async function receiptAddresses(orgId: number, payerUserId: string | null): Promise<string[]> {
  const [payer, org] = await Promise.all([
    payerUserId ? getCustomerEmail(payerUserId) : Promise.resolve(null),
    prisma.advertiserOrg.findUnique({ where: { id: orgId }, select: { billing_email: true } }),
  ])
  const seen = new Set<string>()
  const out: string[] = []
  for (const address of [payer, org?.billing_email]) {
    const trimmed = address?.trim()
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue
    seen.add(trimmed.toLowerCase())
    out.push(trimmed)
  }
  return out
}

async function noticeBillingReaders(
  orgId: number,
  input: { type: string; title: string; body: string; href?: string },
) {
  const ids = await listOrgMemberIdsWithPermission(orgId, "billing:read")
  await notifyCustomerUsers(ids, { orgId, href: BILLING_HREF, ...input })
}

/** Inbox row only, no push (spec channel "Inbox"). */
async function inboxOnly(
  userIds: string[],
  orgId: number,
  input: { type: string; title: string; body: string; href: string },
) {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (!unique.length) return
  await prisma.customerNotification.createMany({
    data: unique.map((clerk_user_id) => ({ clerk_user_id, org_id: orgId, ...input })),
  })
  await publishLive(unique.map(liveChannel.user), { topic: "notification", type: input.type })
}

// ---------------------------------------------------------------- advertiser

/** A1 (campaign: receipt email only — the submit notice follows) | A2 (top-up). */
export function notifyPaymentReceived(p: {
  orgId: number
  payerUserId: string
  amountKes: number
  channel: string | null
  invoiceNumber: string
  campaign: CampaignRef | null
}): Promise<void> {
  const payer = safely("notifyPaymentReceived", async () => {
    const to = await receiptAddresses(p.orgId, p.payerUserId)
    if (to.length) {
      const html = await renderTemplate(PaymentReceipt, {
        amountKes: p.amountKes,
        method: channelLabel(p.channel),
        invoiceNumber: p.invoiceNumber,
        campaignName: p.campaign?.name ?? null,
        paidAt: new Date(),
      })
      const subject = `Receipt: ${kes(p.amountKes)} for ${p.campaign?.name ?? "account top-up"}`
      await sendEmail(to, subject, html)
    }
    if (!p.campaign) {
      await noticeBillingReaders(p.orgId, {
        type: "payment_received",
        title: "Payment received",
        body: `${kes(p.amountKes)} added to your balance.`,
      })
    }
  })
  // O1: every settled payment reaches the admins too. Separate from the payer
  // notices so a failed receipt email can't swallow it.
  const ops = safely("notifyPaymentReceived:ops", async () => {
    const org = await prisma.advertiserOrg.findUnique({ where: { id: p.orgId }, select: { name: true } })
    await alertOpsFinance({
      title: `Payment received: ${kes(p.amountKes)} from ${org?.name ?? `org #${p.orgId}`}`,
      body: `${channelLabel(p.channel)} payment for ${p.campaign?.name ?? "an account top-up"}. Invoice ${p.invoiceNumber}.`,
      email: true,
    })
  })
  // Open Billing screens (advertiser) and the ops ledger refresh, whether or not a row was written.
  const live = publishLive([liveChannel.org(p.orgId), liveChannel.ops], { topic: "payment" })
  return Promise.all([payer, ops, live]).then(() => undefined)
}

/**
 * A quote or invoice ops sent, or a payment ops recorded against one. Billing readers get an inbox
 * row (which also publishes to their live stream) and the org's open Billing screens refresh.
 */
export function notifyBillingDocument(
  doc: { id: number; orgId: number | null; kind: string; number: string },
  event: "sent" | "payment"
): Promise<void> {
  return safely("notifyBillingDocument", async () => {
    if (doc.orgId == null) return
    const noun = doc.kind === "quote" ? "quote" : "invoice"
    await noticeBillingReaders(
      doc.orgId,
      event === "sent"
        ? {
            type: "billing_document_sent",
            title: `New ${noun} ${doc.number}`,
            body: `Admobi sent you ${noun} ${doc.number}. Open Billing to view or download it.`,
            href: "/billing?tab=invoices",
          }
        : {
            type: "billing_document_payment",
            title: `Payment recorded on ${doc.number}`,
            body: `We've recorded a payment against ${noun} ${doc.number}.`,
            href: "/billing?tab=invoices",
          }
    )
    await publishLive([liveChannel.org(doc.orgId)], { topic: "billing-document", id: doc.id })
  })
}

/** A3: paid, but the balance no longer covers the budget. */
export function notifyPaymentNotApplied(p: {
  orgId: number
  amountKes: number
  campaign: CampaignRef
  /** Still needed to fund the campaign; null when the campaign is no longer editable. */
  shortKes?: number | null
}): Promise<void> {
  return safely("notifyPaymentNotApplied", () =>
    noticeBillingReaders(p.orgId, {
      type: "payment_not_applied",
      title: "Payment received, campaign not submitted",
      body: p.shortKes
        ? `${kes(p.amountKes)} is in your balance, but ${p.campaign.name} still needs ${kes(p.shortKes)} to be funded. Pay the rest to send it for review.`
        : `${kes(p.amountKes)} is in your balance. Submit ${p.campaign.name} again to use it.`,
      href: `/campaigns/${p.campaign.id}`,
    }),
  )
}

/** A4: payer only. */
export function notifyPaymentFailed(p: {
  orgId: number
  payerUserId: string
  campaign: CampaignRef | null
}): Promise<void> {
  return safely("notifyPaymentFailed", () =>
    inboxOnly([p.payerUserId], p.orgId, {
      type: "payment_failed",
      title: "Payment didn't go through",
      body: `Nothing was charged for ${p.campaign?.name ?? "your top-up"}. You can try again.`,
      href: p.campaign ? `/campaigns/${p.campaign.id}` : BILLING_HREF,
    }),
  )
}

/** A5 (payer inbox) + O2 (ops push + email). */
export function notifyPaymentMismatch(p: {
  orgId: number
  payerUserId: string
  reference: string
}): Promise<void> {
  return safely("notifyPaymentMismatch", async () => {
    await inboxOnly([p.payerUserId], p.orgId, {
      type: "payment_review",
      title: "We're checking your payment",
      body: "Your payment needs a manual check. We'll update you within one working day.",
      href: BILLING_HREF,
    })
    await alertOpsFinance({
      title: `Payment amount mismatch: ${p.reference}`,
      body: `Paystack reported a different amount or currency for ${p.reference} (org #${p.orgId}). Nothing was credited.`,
      email: true,
    })
  })
}

const RELEASE_REASON = {
  rejected: "was not approved",
  cancelled: "was cancelled",
  completed: "finished under budget",
} as const

/** A6. */
export function notifyCreditReleased(p: {
  orgId: number
  amountKes: number
  campaign: CampaignRef
  reason: keyof typeof RELEASE_REASON
}): Promise<void> {
  return safely("notifyCreditReleased", () =>
    noticeBillingReaders(p.orgId, {
      type: "credit_released",
      title: `${kes(p.amountKes)} back in your balance`,
      body: `${p.campaign.name} ${RELEASE_REASON[p.reason]}. The money is yours to use or refund.`,
    }),
  )
}

/** A7: ops recorded a bank transfer. */
export function notifyManualTopUp(p: { orgId: number; amountKes: number }): Promise<void> {
  return safely("notifyManualTopUp", () =>
    noticeBillingReaders(p.orgId, {
      type: "payment_received",
      title: "Bank transfer received",
      body: `${kes(p.amountKes)} added to your balance.`,
    }),
  )
}

const REFUND_METHOD = { mpesa: "M-Pesa", card: "card", other: "original payment method" } as const

/** A8 (email + inbox + push) | A9 (inbox) | A10 (inbox + O4 ops alert, emailed). */
export function notifyRefundUpdate(p: {
  orgId: number
  amountKes: number
  method: keyof typeof REFUND_METHOD
  stage: "sent" | "processed" | "delayed"
  /** Who paid the refunded payment, for the A8 email; billing_email always gets it too. */
  payerUserId?: string | null
}): Promise<void> {
  return safely("notifyRefundUpdate", async () => {
    if (p.stage === "sent") {
      const title = "Refund on its way"
      const body = `${kes(p.amountKes)} is going back to your ${REFUND_METHOD[p.method]}. It can take up to 10 business days.`
      await noticeBillingReaders(p.orgId, { type: "refund_sent", title, body })
      const to = await receiptAddresses(p.orgId, p.payerUserId ?? null)
      if (to.length) await sendEmail(to, title, await renderTemplate(MoneyUpdate, { title, body }))
      return
    }

    const ids = await listOrgMemberIdsWithPermission(p.orgId, "billing:read")
    if (p.stage === "processed") {
      await inboxOnly(ids, p.orgId, {
        type: "refund_processed",
        title: "Refund completed",
        body: `${kes(p.amountKes)} has been returned.`,
        href: BILLING_HREF,
      })
      return
    }

    await inboxOnly(ids, p.orgId, {
      type: "refund_delayed",
      title: "Refund delayed",
      body: `We couldn't complete your ${kes(p.amountKes)} refund yet. Our team will contact you.`,
      href: BILLING_HREF,
    })
    const org = await prisma.advertiserOrg.findUnique({ where: { id: p.orgId }, select: { name: true } })
    await alertOpsFinance({
      title: `Refund needs attention: ${org?.name ?? `org #${p.orgId}`}`,
      body: `A ${kes(p.amountKes)} refund failed or needs attention in Paystack.`,
      email: true,
    })
  })
}

// ---------------------------------------------------------------------- ops

/** O2–O7 primitive: push to every ops device; email the admins when urgent. */
export function alertOpsFinance(p: { title: string; body: string; email?: boolean }): Promise<void> {
  return safely("alertOpsFinance", async () => {
    await notifyOpsStaffAlert({
      type: "finance",
      entityId: 0,
      submitterName: "Finance",
      title: p.title,
      body: p.body,
      href: OPS_FINANCES_HREF,
    })
    if (p.email) {
      await sendAdminEmail(p.title, await renderTemplate(MoneyUpdate, { title: p.title, body: p.body }))
    }
  })
}

// ------------------------------------------------------------------- driver

async function noticeDriver(clerkUserId: string, type: string, title: string, body: string) {
  await prisma.driverNotification.create({ data: { clerk_user_id: clerkUserId, type, title, body } })
  await notifyUserPush("driver", clerkUserId, { title, body, href: DRIVER_EARNINGS_HREF })
}

/** D1 | D2. */
export function notifyPayoutUpdate(p: {
  driverClerkUserId: string
  amountKes: number
  method: "mpesa" | "bank"
  stage: "settled" | "failed"
}): Promise<void> {
  return safely("notifyPayoutUpdate", () =>
    p.stage === "settled"
      ? noticeDriver(
          p.driverClerkUserId,
          "payout_settled",
          "Payout sent",
          `${kes(p.amountKes)} sent to your ${p.method === "mpesa" ? "M-Pesa" : "bank account"}.`,
        )
      : noticeDriver(
          p.driverClerkUserId,
          "payout_failed",
          "Payout didn't go through",
          "We're looking into it and will resend.",
        ),
  )
}

/** D3: account-takeover guard — a changed number redirects money. */
export function notifyPayoutDetailsChanged(driverClerkUserId: string): Promise<void> {
  return safely("notifyPayoutDetailsChanged", async () => {
    const title = "Your payout details changed"
    const body = "If this wasn't you, contact support now."
    await noticeDriver(driverClerkUserId, "payout_details_changed", title, body)
    const email = await getDriverEmail(driverClerkUserId)
    if (email) await sendEmail(email, title, await renderTemplate(MoneyUpdate, { title, body }))
  })
}
