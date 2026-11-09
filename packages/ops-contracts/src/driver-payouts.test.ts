import { describe, expect, it } from "vitest"

import { payoutDestinationLabel, payoutFocus } from "./driver-payouts"
import type { DriverPayoutsDto } from "./types"

const dto = (...statuses: string[]): DriverPayoutsDto => ({
  items: statuses.map((status, i) => ({
    id: i + 1,
    periodMonth: `2026-${String(11 - i).padStart(2, "0")}`,
    amountKes: 1000 * (i + 1),
    status,
    paidAt: status === "settled" ? "2026-11-05T09:00:00.000Z" : null,
  })),
  summary: { lastPayout: null, paidThisYearKes: 0, pendingKes: 0 },
})

describe("payoutFocus", () => {
  it("is none with no payouts", () => {
    expect(payoutFocus(dto())).toEqual({ kind: "none" })
  })

  it("leads with the newest payout and maps its stage", () => {
    expect(payoutFocus(dto("pending", "settled"))).toMatchObject({ kind: "in_flight", stage: 0, payout: { id: 1 } })
    expect(payoutFocus(dto("processing"))).toMatchObject({ kind: "in_flight", stage: 1 })
    expect(payoutFocus(dto("settled", "failed"))).toMatchObject({ kind: "paid", stage: 2 })
  })

  it("never shows a failed, reversed, or unknown status as fine", () => {
    expect(payoutFocus(dto("failed"))).toMatchObject({ kind: "problem", stage: 1 })
    expect(payoutFocus(dto("reversed"))).toMatchObject({ kind: "problem", stage: 2 })
    expect(payoutFocus(dto("on_hold"))).toMatchObject({ kind: "problem" })
  })
})

describe("payoutDestinationLabel", () => {
  const base = { payout_method: null, payout_mpesa_msisdn: null, payout_bank_name: null, payout_bank_account: null }

  it("masks all but the last four digits", () => {
    expect(payoutDestinationLabel({ ...base, payout_method: "mpesa", payout_mpesa_msisdn: "254712344521" })).toBe(
      "M-Pesa ••• 4521",
    )
    expect(
      payoutDestinationLabel({ ...base, payout_method: "bank", payout_bank_name: "KCB", payout_bank_account: "11029012" }),
    ).toBe("KCB ••• 9012")
  })

  it("degrades without details", () => {
    expect(payoutDestinationLabel({ ...base, payout_method: "mpesa" })).toBe("M-Pesa")
    expect(payoutDestinationLabel(base)).toBeNull()
  })
})
