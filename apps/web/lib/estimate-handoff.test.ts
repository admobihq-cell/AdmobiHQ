import { describe, expect, it } from "vitest"

import { estimateHref, readEstimate } from "./estimate-handoff"

describe("estimate handoff", () => {
  it("round-trips a simulator estimate onto the brief fields", () => {
    const href = estimateHref({ format: "taxi_top", days: 14, total: 150_000.4, summary: "20 screens · 14 days" })
    expect(readEstimate(href.split("?")[1]!)).toEqual({
      adFormats: ["taxi_top"],
      duration: "2_weeks",
      budget: "50k_150k",
      brief: "20 screens · 14 days",
    })
  })

  it("buckets days and totals at the edges", () => {
    expect(readEstimate("days=1&total=49999")).toEqual({ duration: "1_day", budget: "under_50k" })
    expect(readEstimate("days=31&total=500000")).toEqual({ duration: "1_month", budget: "150k_500k" })
    expect(readEstimate("days=90&total=500001")).toEqual({ duration: "ongoing", budget: "500k_plus" })
  })

  it("ignores junk params", () => {
    expect(readEstimate("format=billboard&days=abc&total=-5&estimate=%20")).toEqual({})
  })
})
