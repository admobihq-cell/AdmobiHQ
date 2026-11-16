import { describe, expect, it } from "vitest"

import type { ChartPalette } from "../palette"
import { alertColor, deltaColor, rangeLabel, statusColor } from "./tones"

const palette: ChartPalette = {
  text: "#111111",
  muted: "#666666",
  grid: "#dddddd",
  surface: "#ffffff",
  border: "#cccccc",
  series: ["#a00000"],
  good: "#00a000",
  bad: "#c00000",
  warning: "#c08000",
  neutral: "#888888",
  sample: "#6060c0",
}

describe("statusColor", () => {
  it("maps each status tone to a palette colour", () => {
    expect(statusColor(palette, "good")).toBe(palette.good)
    expect(statusColor(palette, "warning")).toBe(palette.warning)
    expect(statusColor(palette, "serious")).toBe(palette.bad)
    expect(statusColor(palette, "neutral")).toBe(palette.neutral)
  })
})

describe("alertColor", () => {
  it("maps each alert tone to a palette colour", () => {
    expect(alertColor(palette, "bad")).toBe(palette.bad)
    expect(alertColor(palette, "warn")).toBe(palette.warning)
    expect(alertColor(palette, "info")).toBe(palette.neutral)
  })
})

describe("deltaColor", () => {
  it("maps a delta tone to a palette colour", () => {
    expect(deltaColor(palette, "good")).toBe(palette.good)
    expect(deltaColor(palette, "bad")).toBe(palette.bad)
    expect(deltaColor(palette, "neutral")).toBe(palette.neutral)
  })
})

describe("rangeLabel", () => {
  it("writes ranges as the web toolbar does", () => {
    expect(rangeLabel("7d")).toBe("7D")
    expect(rangeLabel("30d")).toBe("30D")
    expect(rangeLabel("90d")).toBe("90D")
    expect(rangeLabel("all")).toBe("All")
  })
})
