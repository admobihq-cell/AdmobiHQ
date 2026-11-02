import { describe, expect, it } from "vitest"

import {
  ALL_TIME_START,
  committedKes,
  costPerThousand,
  delta,
  fillDays,
  foldOther,
  frequency,
  measurementLevel,
  monthlyStatements,
  nairobiDay,
  netMargin,
  rate,
  resolveReportRange,
  runwayDays,
  sumNullable,
} from "./analytics"
import { formatCompact, formatKes, toCsv } from "./format"

describe("foldOther", () => {
  it("keeps the top four and folds the rest into Other", () => {
    expect(
      foldOther([
        { name: "a", value: 9 },
        { name: "b", value: 8 },
        { name: "c", value: 7 },
        { name: "d", value: 6 },
        { name: "e", value: 5 },
        { name: "f", value: 4 },
      ])
    ).toEqual([
      { name: "a", value: 9 },
      { name: "b", value: 8 },
      { name: "c", value: 7 },
      { name: "d", value: 6 },
      { name: "Other", value: 9 },
    ])
  })

  it("returns empty for empty input", () => {
    expect(foldOther([])).toEqual([])
  })

  it("leaves a list at or under the limit alone", () => {
    const rows = [
      { name: "a", value: 1 },
      { name: "b", value: 2 },
    ]
    expect(foldOther(rows)).toEqual(rows)
  })
})

describe("fillDays", () => {
  it("fills missing days with zeros", () => {
    expect(fillDays([{ day: "2026-01-02", n: 3 }], "2026-01-01", "2026-01-03", ["n"])).toEqual([
      { day: "2026-01-01", n: 0 },
      { day: "2026-01-02", n: 3 },
      { day: "2026-01-03", n: 0 },
    ])
  })

  it("crosses month and year ends without skipping a day", () => {
    const days = fillDays([], "2026-12-30", "2027-01-02", ["n"]).map((r) => r.day)
    expect(days).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"])
  })
})

describe("ratios", () => {
  it("cost per 1,000", () => {
    expect(costPerThousand(5000, 1000000)).toBe(5)
    expect(costPerThousand(5000, 0)).toBeNull()
    expect(costPerThousand(null, 1000)).toBeNull()
  })

  it("frequency", () => {
    expect(frequency(900, 300)).toBe(3)
    expect(frequency(900, 0)).toBeNull()
  })

  it("rate", () => {
    expect(rate(1, 0)).toBeNull()
    expect(rate(1, 4)).toBe(0.25)
  })
})

describe("sumNullable", () => {
  it("is null when every value is null, so missing data never reads as zero", () => {
    expect(sumNullable([null, null])).toBeNull()
    expect(sumNullable([])).toBeNull()
  })

  it("adds the values that exist", () => {
    expect(sumNullable([null, 4, 6])).toBe(10)
  })
})

describe("delta", () => {
  it("reports percent change against the previous period", () => {
    expect(delta(110, 100)).toEqual({ current: 110, previous: 100, change: 10 })
    expect(delta(50, 100).change).toBe(-50)
  })

  it("has no change when there is nothing to compare against", () => {
    expect(delta(5, 0).change).toBeNull()
    expect(delta(5, null).change).toBeNull()
  })
})

describe("measurementLevel", () => {
  it("is the lowest level in view", () => {
    expect(measurementLevel(["calibrated", "logged"])).toBe("logged")
    expect(measurementLevel(["calibrated", "modelled"])).toBe("modelled")
    expect(measurementLevel(["calibrated"])).toBe("calibrated")
  })

  it("is booked with no rows or a schedule-only row", () => {
    expect(measurementLevel([])).toBe("booked")
    expect(measurementLevel(["schedule", "calibrated"])).toBe("booked")
  })
})

describe("money maths", () => {
  it("runway", () => {
    expect(runwayDays(100000, 0)).toBeNull()
    expect(runwayDays(100000, 3000)).toBe(33)
    expect(runwayDays(-5000, 3000)).toBe(0)
  })

  it("committed floors each campaign at zero", () => {
    expect(
      committedKes([
        { budgetKes: 100, spentKes: 150 },
        { budgetKes: 100, spentKes: 40 },
      ])
    ).toBe(60)
  })

  it("net margin scales tool costs to the range", () => {
    expect(
      netMargin({ revenueKes: 100000, payoutsKes: 40000, toolsMonthlyKes: 30000, rangeDays: 30 })
    ).toBe(30000)
    expect(
      netMargin({ revenueKes: 100000, payoutsKes: 40000, toolsMonthlyKes: 30000, rangeDays: 15 })
    ).toBe(45000)
  })
})

describe("format", () => {
  it("formats KES", () => {
    expect(formatKes(1200)).toBe("KES 1,200")
    expect(formatKes(-1200)).toBe("-KES 1,200")
    expect(formatKes(null)).toBe("—")
  })

  it("formats compact numbers", () => {
    expect(formatCompact(1200000)).toBe("1.2M")
    expect(formatCompact(null)).toBe("—")
  })

  it("builds CSV with escaping", () => {
    expect(toCsv([{ a: "x,y", b: null }], ["a", "b"])).toBe('a,b\n"x,y",')
  })
})

describe("resolveReportRange", () => {
  const today = new Date("2026-11-01")

  it("compares a custom range with the same-length window before it", () => {
    const r = resolveReportRange({ from: "2026-10-01", to: "2026-10-10" }, today)
    expect(r).toEqual({
      start: "2026-10-01",
      end: "2026-10-10",
      previous: { start: "2026-09-21", end: "2026-09-30" },
    })
  })

  it("counts today as the last day of a preset", () => {
    expect(resolveReportRange({ range: "7d" }, today)).toEqual({
      start: "2026-10-26",
      end: "2026-11-01",
      previous: { start: "2026-10-19", end: "2026-10-25" },
    })
  })

  it("defaults to 30 days", () => {
    expect(resolveReportRange({}, today).start).toBe("2026-10-03")
  })

  it("all time has no comparison", () => {
    const r = resolveReportRange({ range: "all" }, today)
    expect(r).toEqual({ start: ALL_TIME_START, end: "2026-11-01", previous: null })
  })

  it("uses the Nairobi calendar day", () => {
    // 22:30 UTC on 31 Oct is 01:30 on 1 Nov in Nairobi.
    expect(nairobiDay(new Date("2026-10-31T22:30:00Z"))).toBe("2026-11-01")
    expect(resolveReportRange({ range: "7d" }, new Date("2026-10-31T22:30:00Z")).end).toBe(
      "2026-11-01"
    )
  })

  it("rejects bad input", () => {
    expect(() => resolveReportRange({ from: "2026-10-10", to: "2026-10-01" }, new Date())).toThrow(
      RangeError
    )
    expect(() => resolveReportRange({ from: "2025-01-01", to: "2026-10-01" }, new Date())).toThrow(
      RangeError
    )
    expect(() => resolveReportRange({ from: "2026-02-30", to: "2026-03-01" }, today)).toThrow(
      RangeError
    )
    expect(() => resolveReportRange({ from: "2026-10-01" }, today)).toThrow(RangeError)
    expect(() => resolveReportRange({ range: "14d" }, today)).toThrow(RangeError)
  })

  it("allows exactly 366 days", () => {
    expect(resolveReportRange({ from: "2025-10-01", to: "2026-10-01" }, today).start).toBe(
      "2025-10-01"
    )
  })
})

describe("monthlyStatements", () => {
  it("chains each closing into the next opening", () => {
    const rows = monthlyStatements([
      { month: "2026-09", kind: "top_up", amountKes: 1000 },
      { month: "2026-09", kind: "spend", amountKes: -400 },
      { month: "2026-10", kind: "spend", amountKes: -100 },
    ])
    expect(rows[0]).toMatchObject({ opening: 0, closing: 600 })
    expect(rows[1]).toMatchObject({ opening: 600, closing: 500 })
  })

  it("splits a month by kind and sorts by month", () => {
    const rows = monthlyStatements([
      { month: "2026-10", kind: "refund", amountKes: 50 },
      { month: "2026-09", kind: "top_up", amountKes: 1000 },
      { month: "2026-10", kind: "adjustment", amountKes: -20 },
      { month: "2026-10", kind: "spend", amountKes: -300 },
    ])
    expect(rows.map((r) => r.month)).toEqual(["2026-09", "2026-10"])
    expect(rows[1]).toEqual({
      month: "2026-10",
      opening: 1000,
      topUpsKes: 0,
      spendKes: 300,
      refundsKes: 50,
      adjustmentsKes: -20,
      closing: 730,
    })
  })

  it("does not drift on cents", () => {
    const rows = monthlyStatements([
      { month: "2026-09", kind: "top_up", amountKes: 0.1 },
      { month: "2026-09", kind: "top_up", amountKes: 0.2 },
    ])
    expect(rows[0]?.closing).toBe(0.3)
  })
})
