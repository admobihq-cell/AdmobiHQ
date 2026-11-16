import { describe, expect, it } from "vitest"

import { groupPayoutsByYear, payoutDestinationLabel, payoutFocus, payoutMonthBars, payoutTakeaway } from "./driver-payouts"
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

describe("groupPayoutsByYear", () => {
  const item = (periodMonth: string, amountKes: number, status: string) => ({ id: Math.random(), periodMonth, amountKes, status, paidAt: null })

  it("groups newest year first and keeps the order within a year", () => {
    const out = groupPayoutsByYear([item("2026-11", 100, "settled"), item("2026-10", 200, "settled"), item("2025-12", 50, "settled")])
    expect(out.map((g) => g.year)).toEqual(["2026", "2025"])
    expect(out[0]!.items.map((i) => i.periodMonth)).toEqual(["2026-11", "2026-10"])
  })

  it("counts only settled payouts as paid: pending, failed and reversed are not money in the bank", () => {
    const [g] = groupPayoutsByYear([
      item("2026-11", 100, "pending"),
      item("2026-10", 200, "settled"),
      item("2026-09", 400, "failed"),
      item("2026-08", 800, "reversed"),
      item("2026-07", 1600, "settled"),
    ])
    expect(g!.paidKes).toBe(1800)
  })

  it("returns nothing for no payouts", () => {
    expect(groupPayoutsByYear([])).toEqual([])
  })
})

describe("payoutMonthBars", () => {
  const item = (periodMonth: string, amountKes: number, status: string) => ({ id: 1, periodMonth, amountKes, status, paidAt: null })

  it("runs oldest to newest and stacks each status where a driver would expect it", () => {
    const bars = payoutMonthBars([item("2026-11", 300, "processing"), item("2026-10", 200, "settled"), item("2026-09", 100, "failed")])
    expect(bars.map((b) => b.label)).toEqual(["Sep", "Oct", "Nov"])
    expect(bars[0]!.segments).toEqual([{ key: "paid", value: 0 }, { key: "onItsWay", value: 0 }, { key: "failed", value: 100 }])
    expect(bars[1]!.segments.find((s) => s.key === "paid")!.value).toBe(200)
    expect(bars[2]!.segments.find((s) => s.key === "onItsWay")!.value).toBe(300)
  })

  it("keeps only the latest twelve months", () => {
    // 15 consecutive months: 2025-01 .. 2026-03
    const many = Array.from({ length: 15 }, (_, i) => item(`${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`, 100, "settled"))
    const bars = payoutMonthBars(many)
    expect(bars).toHaveLength(12)
    expect(bars[0]!.label).toBe("Apr") // 2025-04 is the 12th newest of 15
    expect(bars[11]!.label).toBe("Mar")
  })

  it("is empty with no payouts", () => {
    expect(payoutMonthBars([])).toEqual([])
  })
})

describe("payoutTakeaway", () => {
  const item = (periodMonth: string, amountKes: number, status: string) => ({ id: 1, periodMonth, amountKes, status, paidAt: null })

  it("names the best settled month in plain words", () => {
    expect(payoutTakeaway([item("2026-10", 21750, "settled"), item("2026-09", 19200, "settled"), item("2026-11", 99999, "processing")])).toBe(
      "Oct 2026 was your best month so far: KES 21,750.",
    )
  })

  it("says nothing until there are two paid months to compare, and never counts money that has not arrived", () => {
    expect(payoutTakeaway([item("2026-10", 21750, "settled")])).toBeUndefined()
    expect(payoutTakeaway([item("2026-10", 21750, "settled"), item("2026-09", 5000, "failed")])).toBeUndefined()
  })
})
