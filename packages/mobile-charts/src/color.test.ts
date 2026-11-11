import { describe, expect, it } from "vitest"

import { heatAlpha, withAlpha } from "./color"

describe("withAlpha", () => {
  it("turns a 6-digit hex into an rgba string", () => {
    expect(withAlpha("#ff0000", 0.5)).toBe("rgba(255,0,0,0.5)")
    expect(withAlpha("#2863ab", 1)).toBe("rgba(40,99,171,1)")
  })

  it("expands a 3-digit hex", () => {
    expect(withAlpha("#f00", 0.25)).toBe("rgba(255,0,0,0.25)")
  })

  it("leaves anything it can't parse unchanged rather than throwing", () => {
    expect(withAlpha("rgba(1,2,3,0.4)", 0.5)).toBe("rgba(1,2,3,0.4)")
    expect(withAlpha("not-a-colour", 0.5)).toBe("not-a-colour")
  })
})

describe("heatAlpha", () => {
  it("is faint for nothing and strongest for the biggest cell", () => {
    expect(heatAlpha(0, 100)).toBeCloseTo(0.06)
    expect(heatAlpha(100, 100)).toBe(1)
  })

  it("grows with the value", () => {
    expect(heatAlpha(25, 100)).toBeLessThan(heatAlpha(75, 100))
  })

  it("is safe when the maximum is zero or the value is negative", () => {
    expect(heatAlpha(5, 0)).toBeCloseTo(0.06)
    expect(heatAlpha(-5, 100)).toBeCloseTo(0.06)
  })
})
