export const PAYMENT_STATUSES = ["initiated", "success", "failed", "abandoned", "amount_mismatch"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const REFUND_STATUSES = ["pending", "processing", "needs_attention", "processed", "failed"] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const PAYOUT_STATUSES = ["pending", "processing", "settled", "failed", "reversed"] as const
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number]
