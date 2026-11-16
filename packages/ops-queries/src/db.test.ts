import { describe, expect, it } from "vitest"

import { num, rowsOf, type Db } from "./db"

describe("rowsOf", () => {
  it("runs the sql with its params on the given db and returns only the rows", async () => {
    const calls: Array<[string, unknown[] | undefined]> = []
    const db: Db = {
      query: async (text, params) => {
        calls.push([text, params])
        return { rows: [{ n: 1 }, { n: 2 }], rowCount: 2 } as never
      },
    }
    const rows = rowsOf(db)
    expect(await rows<{ n: number }>("SELECT n FROM t WHERE x = $1", [7])).toEqual([{ n: 1 }, { n: 2 }])
    expect(calls).toEqual([["SELECT n FROM t WHERE x = $1", [7]]])
  })
})

describe("num", () => {
  it("turns null and undefined into 0 and numeric strings into numbers", () => {
    expect(num(null)).toBe(0)
    expect(num(undefined)).toBe(0)
    expect(num("12.5")).toBe(12.5)
    expect(num(3)).toBe(3)
  })
})
