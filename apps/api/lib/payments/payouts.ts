import type { DriverProfile } from "@prisma/client"

import { alertOpsFinance, notifyPayoutUpdate } from "@/lib/payments/money-notify"
import {
  bulkTransfer,
  createTransferRecipient,
  fromSubunit,
  getKesBalance,
  listKesBanks,
  PaystackError,
  toPaystackMpesaNumber,
  toSubunit,
  verifyTransfer,
} from "@/lib/payments/paystack"
import { prisma } from "@/lib/prisma"

const BULK_LIMIT = 100
const BULK_SPACING_MS = 5_000
const roundKes = (value: number) => Math.round(value * 100) / 100

/** Paystack wants ≥ 5 s between bulk calls. Exported so tests can skip the wait. */
export const timing = { wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)) }

export class InsufficientBalanceError extends Error {
  constructor(
    public balanceKes: number,
    public requiredKes: number,
  ) {
    super("Paystack balance too low")
  }
}

/** "adm-payout-42-202611". The same reference is reused on retry, which Paystack treats as idempotent. */
export function transferReference(payoutId: number, periodMonth: Date): string {
  const yyyymm = periodMonth.toISOString().slice(0, 7).replace("-", "")
  return `adm-payout-${payoutId}-${yyyymm}`
}

/** Paystack Kenya transfer fees (spec §8.3), for the Disburse confirmation and balance check. */
export function estimateTransferFeeKes(method: "mpesa" | "bank", amountKes: number): number {
  if (method === "mpesa") return amountKes <= 1500 ? 20 : amountKes <= 20000 ? 40 : 60
  return amountKes <= 10000 ? 80 : amountKes <= 50000 ? 120 : 140
}

const methodOf = (p: Pick<DriverProfile, "payout_method">): "mpesa" | "bank" | null =>
  p.payout_method === "mpesa" || p.payout_method === "bank" ? p.payout_method : null

async function bankCodeForName(name: string | null): Promise<string | null> {
  const wanted = name?.trim().toLowerCase()
  if (!wanted) return null
  return (await listKesBanks()).find((b) => b.name.trim().toLowerCase() === wanted)?.code ?? null
}

/** Creates the Paystack transfer recipient on first use and stores its code. */
export async function ensureRecipient(profile: DriverProfile): Promise<string> {
  if (profile.paystack_recipient_code) return profile.paystack_recipient_code
  const name = profile.full_name?.trim() || `Driver ${profile.id}`
  const method = methodOf(profile)
  let recipient: { recipientCode: string }
  if (method === "mpesa" && profile.payout_mpesa_msisdn) {
    recipient = await createTransferRecipient({
      type: "mobile_money",
      name,
      accountNumber: toPaystackMpesaNumber(profile.payout_mpesa_msisdn),
      bankCode: "MPESA",
    })
  } else if (method === "bank" && profile.payout_bank_account) {
    // Profiles saved before the bank picker have a typed name only: match it to Paystack's list.
    const bankCode = profile.payout_bank_code ?? (await bankCodeForName(profile.payout_bank_name))
    if (!bankCode) throw new Error(`Bank "${profile.payout_bank_name ?? "?"}" not recognised by Paystack; set the bank again`)
    recipient = await createTransferRecipient({
      type: "kepss",
      name,
      accountNumber: profile.payout_bank_account.replace(/\s+/g, ""),
      bankCode,
    })
  } else {
    throw new Error("Payout details are incomplete")
  }
  // Only store it if the details haven't changed in the meantime.
  await prisma.driverProfile.updateMany({
    where: {
      id: profile.id,
      payout_mpesa_msisdn: profile.payout_mpesa_msisdn,
      payout_bank_account: profile.payout_bank_account,
      payout_bank_code: profile.payout_bank_code,
    },
    data: { paystack_recipient_code: recipient.recipientCode },
  })
  return recipient.recipientCode
}

/** Approved drivers with usable payout details, for a payout run. */
export function eligibleDriverProfiles() {
  return prisma.driverProfile.findMany({
    where: {
      status: "approved",
      OR: [
        { payout_method: "mpesa", payout_mpesa_msisdn: { not: null } },
        { payout_method: "bank", payout_bank_account: { not: null } },
      ],
    },
    orderBy: { full_name: "asc" },
  })
}

/** Saves typed amounts as `pending` rows for the month. Rows already sent are left alone. */
export async function savePayoutRun(
  periodMonth: string,
  items: { driverProfileId: number; amountKes: number }[],
  opsEmail: string,
): Promise<{ saved: number; skipped: { driverProfileId: number; reason: string }[] }> {
  const month = new Date(`${periodMonth}-01T00:00:00Z`)
  const eligible = new Map((await eligibleDriverProfiles()).map((p) => [p.id, p]))
  const skipped: { driverProfileId: number; reason: string }[] = []
  let saved = 0
  for (const item of items) {
    if (!eligible.has(item.driverProfileId)) {
      skipped.push({ driverProfileId: item.driverProfileId, reason: "Not an approved driver with payout details" })
      continue
    }
    const existing = await prisma.payout.findFirst({
      where: { driver_profile_id: item.driverProfileId, period_month: month },
    })
    if (existing && existing.status !== "pending") {
      skipped.push({ driverProfileId: item.driverProfileId, reason: `Already ${existing.status}` })
      continue
    }
    const amount_kes = roundKes(item.amountKes)
    if (existing) {
      await prisma.payout.updateMany({ where: { id: existing.id, status: "pending" }, data: { amount_kes, initiated_by_email: opsEmail } })
    } else {
      await prisma.payout.create({
        data: { driver_profile_id: item.driverProfileId, amount_kes, period_month: month, provider: "paystack", initiated_by_email: opsEmail },
      })
    }
    saved += 1
  }
  return { saved, skipped }
}

/**
 * Sends `pending` (or `failed`, for a retry) payouts through Paystack bulk
 * transfers (spec §8.3). Rows move to `processing` BEFORE Paystack is called,
 * which is what lets the transfer-approval URL say yes to them and no to
 * anything else.
 */
export async function disburse(
  payoutIds: number[],
  opsEmail: string,
): Promise<{ queued: number; skipped: { id: number; reason: string }[] }> {
  const rows = await prisma.payout.findMany({ where: { id: { in: payoutIds } }, include: { driverProfile: true } })
  const skipped: { id: number; reason: string }[] = []
  for (const id of payoutIds) if (!rows.some((r) => r.id === id)) skipped.push({ id, reason: "Not found" })

  const sendable = rows.filter((r) => {
    if (!["pending", "failed"].includes(r.status)) return skipped.push({ id: r.id, reason: `Already ${r.status}` }) && false
    if (!r.driverProfile) return skipped.push({ id: r.id, reason: "Legacy payout with no driver profile" }) && false
    if (!methodOf(r.driverProfile)) return skipped.push({ id: r.id, reason: "No payout method" }) && false
    if (!(Number(r.amount_kes) > 0)) return skipped.push({ id: r.id, reason: "Amount must be above zero" }) && false
    return true
  })
  if (!sendable.length) return { queued: 0, skipped }

  const requiredKes = roundKes(
    sendable.reduce((sum, r) => sum + Number(r.amount_kes) + estimateTransferFeeKes(methodOf(r.driverProfile!)!, Number(r.amount_kes)), 0),
  )
  const balanceKes = await getKesBalance()
  if (balanceKes < requiredKes) throw new InsufficientBalanceError(balanceKes, requiredKes)

  // One recipient per driver, however many months are being paid.
  const recipients = new Map<number, string>()
  const ready: typeof sendable = []
  for (const r of sendable) {
    const profile = r.driverProfile!
    try {
      if (!recipients.has(profile.id)) recipients.set(profile.id, await ensureRecipient(profile))
      ready.push(r)
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Couldn't create the Paystack recipient"
      await prisma.payout.update({ where: { id: r.id }, data: { status: "failed", failure_reason: reason } })
      skipped.push({ id: r.id, reason })
    }
  }

  // Claim every row in one statement: two Disburse presses can't both send one.
  // The reference is kept on retry (Paystack treats a reused reference as the same transfer).
  const claimed = new Set(
    (
      await prisma.$queryRaw<{ id: number }[]>`
        UPDATE payouts
        SET status = 'processing',
            reference = COALESCE(reference, 'adm-payout-' || id || '-' || to_char(period_month, 'YYYYMM')),
            provider = 'paystack', failure_reason = NULL, initiated_by_email = ${opsEmail}, updated_at = now()
        WHERE id = ANY(${ready.map((r) => r.id)}::int[]) AND status IN ('pending', 'failed')
        RETURNING id`
    ).map((row) => row.id),
  )
  const queued = ready.flatMap((r) => {
    if (!claimed.has(r.id)) {
      skipped.push({ id: r.id, reason: "Already being sent" })
      return []
    }
    return [{
      id: r.id,
      amountKes: Number(r.amount_kes),
      recipient: recipients.get(r.driverProfile!.id)!,
      reference: r.reference ?? transferReference(r.id, r.period_month),
    }]
  })

  for (let i = 0; i < queued.length; i += BULK_LIMIT) {
    if (i > 0) await timing.wait(BULK_SPACING_MS)
    const chunk = queued.slice(i, i + BULK_LIMIT)
    try {
      // transfer_code is stored from the transfer.* webhook, which carries it too.
      await bulkTransfer(
        chunk.map((q) => ({ amountKes: q.amountKes, recipient: q.recipient, reference: q.reference, reason: "Admobi driver payout" })),
      )
    } catch (error) {
      console.error("[payouts] bulk transfer failed:", error)
      // A Paystack 4xx means the batch was refused outright; anything else is
      // unknown, so the rows stay processing and the cron verifies them.
      if (error instanceof PaystackError && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
        await prisma.payout.updateMany({
          where: { reference: { in: chunk.map((q) => q.reference) }, status: "processing" },
          data: { status: "failed", failure_reason: `Paystack refused the transfer: ${error.message}`.slice(0, 500) },
        })
      }
    }
  }

  return { queued: queued.length, skipped }
}

/** Transfer-approval URL check (spec §8.4): one indexed lookup, no Paystack call. */
export async function approveTransfer(body: { reference?: unknown; amount?: unknown }): Promise<boolean> {
  if (typeof body.reference !== "string" || typeof body.amount !== "number") return false
  const payout = await prisma.payout.findUnique({
    where: { reference: body.reference },
    select: { status: true, amount_kes: true },
  })
  return payout?.status === "processing" && toSubunit(Number(payout.amount_kes)) === body.amount
}

async function notifyDriver(reference: string, stage: "settled" | "failed") {
  const payout = await prisma.payout.findUnique({ where: { reference }, include: { driverProfile: true } })
  const profile = payout?.driverProfile
  if (!payout || !profile) return
  await notifyPayoutUpdate({
    driverClerkUserId: profile.clerk_user_id,
    amountKes: Number(payout.amount_kes),
    method: profile.payout_method === "bank" ? "bank" : "mpesa",
    stage,
  })
  if (stage === "failed") {
    await alertOpsFinance({
      title: `Driver payout failed: ${profile.full_name ?? `driver #${profile.id}`}, KES ${Number(payout.amount_kes).toLocaleString("en-KE")}`,
      body: payout.failure_reason ?? "Paystack reported the transfer failed or reversed.",
    })
  }
}

/** transfer.* webhooks. Notices fire only when our row's status actually changed. */
export async function handleTransferEvent(
  event: string,
  data: { reference?: string; transfer_code?: string; fee_charged?: number; reason?: string },
): Promise<void> {
  const reference = data.reference
  if (!reference?.startsWith("adm-payout-")) return
  if (event === "transfer.success") {
    const { count } = await prisma.payout.updateMany({
      where: { reference, status: { in: ["processing", "failed"] } },
      data: {
        status: "settled",
        paid_at: new Date(),
        fee_kes: data.fee_charged != null ? fromSubunit(data.fee_charged) : null,
        ...(data.transfer_code ? { transfer_code: data.transfer_code } : {}),
        failure_reason: null,
      },
    })
    if (count) await notifyDriver(reference, "settled")
    return
  }
  if (event === "transfer.failed" || event === "transfer.reversed") {
    const status = event === "transfer.failed" ? "failed" : "reversed"
    const { count } = await prisma.payout.updateMany({
      where: { reference, status: { in: status === "failed" ? ["processing"] : ["processing", "settled"] } },
      data: { status, failure_reason: (data.reason ?? `Paystack: ${event}`).slice(0, 500) },
    })
    if (count) await notifyDriver(reference, "failed")
  }
}

/** Transfers still `processing` after a day are verified directly (spec §8.3 step 5). */
export async function reconcileProcessingTransfers(olderThanHours = 24): Promise<{ checked: number }> {
  const stale = await prisma.payout.findMany({
    where: { status: "processing", reference: { not: null }, updated_at: { lt: new Date(Date.now() - olderThanHours * 3_600_000) } },
    select: { reference: true },
    take: 200,
  })
  for (const { reference } of stale) {
    try {
      const t = await verifyTransfer(reference!)
      if (t.status === "success") {
        await handleTransferEvent("transfer.success", { reference: reference!, fee_charged: t.fee_charged ?? undefined })
      } else if (t.status === "failed" || t.status === "reversed") {
        await handleTransferEvent(`transfer.${t.status}`, { reference: reference!, reason: t.reason ?? undefined })
      }
    } catch (error) {
      if (error instanceof PaystackError && error.status === 404) {
        await handleTransferEvent("transfer.failed", { reference: reference!, reason: "Paystack has no record of this transfer" })
      } else {
        console.error(`[payouts] verify ${reference} failed:`, error)
      }
    }
  }
  return { checked: stale.length }
}
