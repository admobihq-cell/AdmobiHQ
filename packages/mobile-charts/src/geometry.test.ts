import { describe, expect, it } from "vitest"

import { barGeometry, donutArcs, linePath, niceMax } from "./geometry"

describe("niceMax", () => {
  it("rounds up to 1, 2, 2.5 or 5 times a power of ten, and is 1 for nothing", () => {
    expect(niceMax(0)).toBe(1)
    expect(niceMax(-5)).toBe(1)
    expect(niceMax(87)).toBe(100)
    expect(niceMax(0.3)).toBe(0.5)
    expect(niceMax(1200)).toBe(2000)
    expect(niceMax(2400)).toBe(2500)
    expect(niceMax(100)).toBe(100)
  })
})

describe("linePath", () => {
  it("draws a straight segment from the first point to the last", () => {
    expect(linePath([0, 10], 100, 50, 0, 10)).toBe("M0,50L100,0")
  })

  it("breaks the line at a null so a gap is not drawn as a value", () => {
    expect(linePath([5, null, 5, 5], 90, 50, 0, 10).match(/M/g)).toHaveLength(2)
  })

  it("draws nothing for an all-null series", () => {
    expect(linePath([null, null], 100, 50, 0, 10)).toBe("")
    expect(linePath([], 100, 50, 0, 10)).toBe("")
  })

  it("draws a lone point as a zero-length segment a round cap shows as a dot", () => {
    expect(linePath([5], 100, 50, 0, 10)).toBe("M0,25l0,0")
  })

  it("never emits NaN or Infinity, even with a flat series", () => {
    expect(linePath([4, 4, 4], 100, 50, 4, 4)).not.toMatch(/NaN|Infinity/)
  })
})

describe("barGeometry", () => {
  it("grows a positive bar up from the baseline", () => {
    expect(barGeometry(5, 0, 10, 100)).toEqual({ y: 50, h: 50 })
  })

  it("puts a negative bar below the baseline instead of clipping it", () => {
    expect(barGeometry(-5, -10, 10, 100)).toEqual({ y: 50, h: 25 })
  })

  it("is empty for a zero value or a degenerate scale", () => {
    expect(barGeometry(0, 0, 10, 100).h).toBe(0)
    expect(barGeometry(5, 3, 3, 100).h).toBe(0)
  })
})

describe("donutArcs", () => {
  it("returns nothing when there is nothing to show", () => {
    expect(donutArcs([0, 0], 40, 8)).toEqual([])
    expect(donutArcs([], 40, 8)).toEqual([])
  })

  it("gives each positive value its share and keeps its original index", () => {
    const arcs = donutArcs([1, 0, 3], 40, 8)
    expect(arcs.map((a) => [a.index, a.share])).toEqual([[0, 0.25], [2, 0.75]])
    expect(arcs.every((a) => a.d.startsWith("M") && !/NaN/.test(a.d))).toBe(true)
  })

  it("draws a single value as a closed ring rather than a degenerate arc", () => {
    const [only] = donutArcs([7], 40, 8)
    expect(only!.share).toBe(1)
    expect(only!.d).not.toMatch(/NaN/)
  })
})
