import { describe, expect, it } from "vitest"

import {
  disburseBalanceCheck,
  disburseReceiptTitle,
  parseBalanceShortBody,
  settleDisburse,
  shiftMonth,
  type DisburseBatchItem,
} from "./payout-ui"

const batch: DisburseBatchItem[] = [
  { id: 1, name: "Mary", amountKes: 4500, feeKes: 30 },
  { id: 2, name: "Juma", amountKes: 3000, feeKes: 30 },
  { id: 3, name: "Amina", amountKes: 2000, feeKes: 30 },
]

describe("settleDisburse", () => {
  it("counts only what was actually sent: rows the API skipped moved no money", () => {
    const out = settleDisburse(batch, { skipped: [{ id: 2, reason: "No payout details" }] })
    expect(out.sent.map((r) => r.id)).toEqual([1, 3])
    expect(out.skipped).toEqual([{ name: "Juma", reason: "No payout details" }])
    expect(out.totalKes).toBe(6500)
    expect(out.feesKes).toBe(60)
  })

  it("treats a batch with nothing skipped as fully sent", () => {
    const out = settleDisburse(batch, { skipped: [] })
    expect(out.sent).toHaveLength(3)
    expect(out.totalKes).toBe(9500)
    expect(out.feesKes).toBe(90)
  })

  it("ignores a skipped id that was never in the batch", () => {
    const out = settleDisburse(batch, { skipped: [{ id: 99, reason: "Unknown" }] })
    expect(out.sent).toHaveLength(3)
    expect(out.skipped).toEqual([])
  })
})

describe("disburseReceiptTitle", () => {
  it("is never 'Payouts sent' unless every row went", () => {
    expect(disburseReceiptTitle(settleDisburse(batch, { skipped: [] }))).toBe("Payouts sent")
    expect(disburseReceiptTitle(settleDisburse(batch, { skipped: [{ id: 1, reason: "x" }] }))).toBe(
      "Some payouts weren’t sent",
    )
  })

  it("says 'Nothing was sent' when every row was refused", () => {
    const all = batch.map((b) => ({ id: b.id, reason: "Paystack refused" }))
    expect(disburseReceiptTitle(settleDisburse(batch, { skipped: all }))).toBe("Nothing was sent")
  })

  it("says 'Nothing was sent' for an empty batch rather than claiming success", () => {
    expect(disburseReceiptTitle(settleDisburse([], { skipped: [] }))).toBe("Nothing was sent")
  })
})

describe("disburseBalanceCheck", () => {
  it("is ok when the balance covers the total plus fees, exactly or with room to spare", () => {
    expect(disburseBalanceCheck(6590, 6500, 90)).toEqual({ state: "ok", requiredKes: 6590 })
    expect(disburseBalanceCheck(100000, 6500, 90)).toEqual({ state: "ok", requiredKes: 6590 })
  })

  it("is short by one shilling when the balance is one under", () => {
    expect(disburseBalanceCheck(6589, 6500, 90)).toEqual({ state: "short", requiredKes: 6590, shortByKes: 1 })
  })

  it("pauses sending when the balance can't be read, instead of guessing", () => {
    expect(disburseBalanceCheck(null, 6500, 90)).toEqual({ state: "unavailable", requiredKes: 6590 })
  })

  it("treats a zero balance as short, not unavailable", () => {
    expect(disburseBalanceCheck(0, 100, 5).state).toBe("short")
  })
})

describe("parseBalanceShortBody", () => {
  it("reads the numbers the API sends with a 402", () => {
    expect(parseBalanceShortBody({ error: "Not enough", balanceKes: 1000, requiredKes: 6590 })).toEqual({
      balanceKes: 1000,
      requiredKes: 6590,
    })
  })

  it("returns null for anything that isn't that shape", () => {
    expect(parseBalanceShortBody(undefined)).toBeNull()
    expect(parseBalanceShortBody(null)).toBeNull()
    expect(parseBalanceShortBody("402")).toBeNull()
    expect(parseBalanceShortBody({ error: "x" })).toBeNull()
    expect(parseBalanceShortBody({ balanceKes: "1000", requiredKes: 5 })).toBeNull()
    expect(parseBalanceShortBody({ balanceKes: Number.NaN, requiredKes: 5 })).toBeNull()
  })
})

describe("shiftMonth", () => {
  it("steps within a year", () => {
    expect(shiftMonth("2026-05", 1)).toBe("2026-06")
    expect(shiftMonth("2026-05", -1)).toBe("2026-04")
  })

  it("rolls over a year boundary in both directions", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01")
    expect(shiftMonth("2026-01", -1)).toBe("2025-12")
  })

  it("steps several months at once and zero is a no-op", () => {
    expect(shiftMonth("2026-11", -11)).toBe("2025-12")
    expect(shiftMonth("2026-11", 14)).toBe("2028-01")
    expect(shiftMonth("2026-11", 0)).toBe("2026-11")
  })
})
