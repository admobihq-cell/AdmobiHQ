import { describe, expect, it } from "vitest"

import { bucketSeries } from "./period-series"

describe("bucketSeries", () => {
  it("fills missing days with zero across the window", () => {
    const out = bucketSeries([{ day: "2026-11-02", revenue: 5, moneyIn: 1 }], "2026-11-01", "2026-11-03", ["revenue", "moneyIn"])
    expect(out.granularity).toBe("day")
    expect(out.points).toEqual([
      { day: "2026-11-01", revenue: 0, moneyIn: 0 },
      { day: "2026-11-02", revenue: 5, moneyIn: 1 },
      { day: "2026-11-03", revenue: 0, moneyIn: 0 },
    ])
  })

  it("rolls long windows up into months, summing each month", () => {
    const out = bucketSeries(
      [
        { day: "2026-01-05", revenue: 2 },
        { day: "2026-01-20", revenue: 3 },
        { day: "2026-03-01", revenue: 7 },
      ],
      "2026-01-01",
      "2026-06-30",
      ["revenue"]
    )
    expect(out.granularity).toBe("month")
    expect(out.points.map((p) => [p.day, p.revenue])).toEqual([
      ["2026-01", 5],
      ["2026-02", 0],
      ["2026-03", 7],
      ["2026-04", 0],
      ["2026-05", 0],
      ["2026-06", 0],
    ])
  })

  it("is empty for an inverted window", () => {
    expect(bucketSeries([], "2026-11-05", "2026-11-01", ["revenue"]).points).toEqual([])
  })
})
