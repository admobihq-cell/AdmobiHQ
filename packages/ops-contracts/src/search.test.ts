import { describe, expect, it } from "vitest"

import { escapeLike, parseSearchQuery, shouldSearch } from "./search"

describe("parseSearchQuery", () => {
  it("reads case-style ids", () => {
    expect(parseSearchQuery("#42").numericId).toBe(42)
    expect(parseSearchQuery(" 42 ").numericId).toBe(42)
    expect(parseSearchQuery("42a").numericId).toBeNull()
    expect(parseSearchQuery("1234567890").numericId).toBeNull()
  })

  it("canonicalises billing document numbers", () => {
    expect(parseSearchQuery("INV/2026/0001").documentNumber).toBe("INV/2026/0001")
    expect(parseSearchQuery("inv-2026-1").documentNumber).toBe("INV/2026/0001")
    expect(parseSearchQuery("qt 2026 12").documentNumber).toBe("QT/2026/0012")
    expect(parseSearchQuery("INV/2026").documentNumber).toBeNull()
  })

  it("spots payout references", () => {
    expect(parseSearchQuery("ADM-PAYOUT-7-202611").payoutReference).toBe("adm-payout-7-202611")
    expect(parseSearchQuery("payout").payoutReference).toBeNull()
  })

  it("treats long single tokens as references", () => {
    expect(parseSearchQuery("T1234567").reference).toBe("T1234567")
    expect(parseSearchQuery("acme ltd").reference).toBeNull()
  })

  it("caps length", () => {
    expect(parseSearchQuery("x".repeat(300)).text).toHaveLength(100)
  })
})

describe("escapeLike", () => {
  it("escapes wildcards", () => expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\"))
})

describe("shouldSearch", () => {
  it("needs two chars or an id", () => {
    expect(shouldSearch("a")).toBe(false)
    expect(shouldSearch("   ")).toBe(false)
    expect(shouldSearch("7")).toBe(true)
    expect(shouldSearch("ac")).toBe(true)
  })
})
