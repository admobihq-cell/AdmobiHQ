import { describe, expect, it } from "vitest"

import { CHART_SERIES } from "./palette"

describe("CHART_SERIES", () => {
  it.each(["light", "dark"] as const)("has five distinct sRGB colours for %s", (mode) => {
    const series = CHART_SERIES[mode]
    expect(series).toHaveLength(5)
    expect(series.every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true)
    expect(new Set(series).size).toBe(5)
  })
})
