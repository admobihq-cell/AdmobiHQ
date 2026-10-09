import { describe, expect, it } from "vitest"

import { MARKET_CELLS, MARKET_KEYS, marketAt, marketCenter } from "./markets"

describe("H3 campaign markets", () => {
  it("each market owns its own anchor", () => {
    for (const m of MARKET_KEYS) expect(marketAt(marketCenter(m))).toBe(m)
  })

  it("no cell belongs to two markets", () => {
    const all = MARKET_KEYS.flatMap((m) => MARKET_CELLS[m])
    expect(new Set(all).size).toBe(all.length)
  })

  it("is null outside every market", () => {
    expect(marketAt([36.95, -1.2])).toBeNull() // past Kasarani on Thika Rd
  })
})
