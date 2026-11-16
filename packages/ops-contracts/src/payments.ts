export const PAYMENT_STATUSES = ["initiated", "success", "failed", "abandoned", "amount_mismatch"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const REFUND_STATUSES = ["pending", "processing", "needs_attention", "processed", "failed"] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const PAYOUT_STATUSES = ["pending", "processing", "settled", "failed", "reversed"] as const
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number]

/* ---- Ops Finances → Paystack tab: live Paystack data, joined to our rows on the server ---- */

export const PAYSTACK_RESOURCES = ["transactions", "settlements", "transfers", "refunds", "disputes"] as const
export type PaystackResource = (typeof PAYSTACK_RESOURCES)[number]

export type PaystackPageDto<T> = { rows: T[]; page: number; pageCount: number; total: number }

export type PaystackSummaryDto = {
  /** Available for transfers (driver payouts). */
  balanceKes: number
  /** Successful collections Paystack has not settled yet. */
  waitingToSettleKes: number
  /** Successful volume and count in the range. */
  volumeKes: number
  transactionCount: number
}

/** Where a Paystack row stands in Admobi's own records. */
export type AdmobiMatch = "credited" | "not_credited" | "not_ours"

export type PaystackTransactionDto = {
  id: number
  reference: string
  status: string
  amountKes: number
  feesKes: number | null
  channel: string | null
  paidAt: string | null
  createdAt: string
  email: string | null
  /** Paystack's reason, e.g. why a payment failed. */
  gatewayResponse: string | null
  match: AdmobiMatch
  orgId: number | null
  orgName: string | null
}

export type PaystackSettlementDto = {
  id: number
  status: string
  totalKes: number
  feesKes: number
  netKes: number
  settledAt: string | null
  createdAt: string | null
}

export type PaystackTransferDto = {
  id: number
  reference: string | null
  status: string
  amountKes: number
  recipientName: string | null
  reason: string | null
  createdAt: string | null
  /** Our payout row for this transfer, when it was sent from ops. */
  payoutId: number | null
}

export type PaystackRefundDto = {
  id: number
  transactionReference: string | null
  amountKes: number
  status: string
  refundedBy: string | null
  note: string | null
  createdAt: string | null
  /** Whether our ledger has this refund (debited from the advertiser). */
  recorded: boolean
  orgId: number | null
  orgName: string | null
}

export type PaystackDisputeDto = {
  id: number
  status: string
  amountKes: number
  transactionReference: string | null
  category: string | null
  resolution: string | null
  dueAt: string | null
  createdAt: string | null
}

export type PaystackRowDto = {
  transactions: PaystackTransactionDto
  settlements: PaystackSettlementDto
  transfers: PaystackTransferDto
  refunds: PaystackRefundDto
  disputes: PaystackDisputeDto
}
