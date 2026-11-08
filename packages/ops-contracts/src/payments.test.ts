import { describe, expect, it } from "vitest"
import { OPS_PERMISSIONS, PAYMENT_STATUSES, PAYOUT_STATUSES, REFUND_STATUSES, VAT_RATE, WALLET_TRANSACTION_KINDS } from "./index"

describe("payments contracts", () => {
  it("adds the cash_refund ledger kind and payouts permission", () => {
    expect(WALLET_TRANSACTION_KINDS).toContain("cash_refund")
    expect(OPS_PERMISSIONS).toContain("payouts")
  })

  it("has no VAT yet", () => {
    expect(VAT_RATE).toBe(0)
  })

  it("pins the status vocabularies", () => {
    expect([...PAYMENT_STATUSES]).toEqual(["initiated", "success", "failed", "abandoned", "amount_mismatch"])
    expect([...REFUND_STATUSES]).toEqual(["pending", "processing", "needs_attention", "processed", "failed"])
    expect([...PAYOUT_STATUSES]).toEqual(["pending", "processing", "settled", "failed", "reversed"])
  })
})
