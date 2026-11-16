import { describe, expect, it } from "vitest"

import { deltaView } from "./delta"

const d = (change: number | null) => ({ current: 2, previous: change === null ? null : 1, change })

describe("deltaView", () => {
  it("says nothing when there is nothing to compare, rather than 0%", () => {
    expect(deltaView(d(null), "up")).toBeNull()
    expect(deltaView(d(Number.NaN), "up")).toBeNull()
  })

  it("colours by meaning, not by sign", () => {
    expect(deltaView(d(100), "up")).toMatchObject({ direction: "up", tone: "good", text: "100.0%" })
    expect(deltaView(d(-50), "up")?.tone).toBe("bad")
    expect(deltaView(d(-50), "down")?.tone).toBe("good")
    expect(deltaView(d(100), "neutral")?.tone).toBe("neutral")
  })

  it("reads a zero change as flat and neutral", () => {
    expect(deltaView(d(0), "up")).toMatchObject({
      direction: "flat",
      tone: "neutral",
      text: "0%",
      label: "No change on the previous period",
    })
  })

  it("writes an accessible label that carries the direction in words", () => {
    expect(deltaView(d(12.34), "up")?.label).toBe("Up 12.3% on the previous period")
    expect(deltaView(d(-5), "up")?.label).toBe("Down 5.0% on the previous period")
  })

  it("uses the caller's formatter for the percentage", () => {
    expect(deltaView(d(-20), "down", (c) => `${c} pts`)?.text).toBe("20 pts")
  })
})
