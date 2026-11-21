import { describe, expect, it } from "vitest"

import { toWeekGrid } from "./week-grid"

const day = (iso: string, hours: number | null) => ({ day: iso, hours })

describe("toWeekGrid", () => {
  it("starts weeks on Monday and leaves days before the range empty", () => {
    // 2026-11-04 is a Wednesday.
    const grid = toWeekGrid([day("2026-11-04", 3), day("2026-11-05", 5)], "hours")
    expect(grid.weeks[0]!.start).toBe("2026-11-02")
    expect(grid.weeks[0]!.days.slice(0, 4)).toEqual([null, null, 3, 5])
  })

  it("keeps a missing day empty rather than zero", () => {
    const grid = toWeekGrid([day("2026-11-02", 1), day("2026-11-04", 2)], "hours")
    expect(grid.weeks[0]!.days[1]).toBeNull()
  })

  it("treats a null value as empty too", () => {
    expect(toWeekGrid([day("2026-11-02", null)], "hours").weeks[0]!.days[0]).toBeNull()
  })

  it("keeps only the last 53 weeks", () => {
    const start = Date.UTC(2025, 0, 1)
    const points = Array.from({ length: 400 }, (_, i) => day(new Date(start + i * 86_400_000).toISOString().slice(0, 10), 1))
    expect(toWeekGrid(points, "hours").weeks).toHaveLength(53)
  })

  it("reports the max, ignoring empty days", () => {
    expect(toWeekGrid([day("2026-11-02", 4), day("2026-11-03", null), day("2026-11-04", 9)], "hours").max).toBe(9)
  })

  it("is empty with no points", () => {
    expect(toWeekGrid([], "hours")).toEqual({ weeks: [], max: 0 })
  })
})
