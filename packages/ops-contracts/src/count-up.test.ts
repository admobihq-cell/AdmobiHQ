import { describe, expect, it } from "vitest"

import { formatCountUp, splitCountUp } from "./count-up"

describe("splitCountUp", () => {
  it("splits money, percents and compact figures", () => {
    expect(splitCountUp("KES 18,420")).toEqual({ prefix: "KES ", value: 18420, decimals: 0, grouped: true, suffix: "" })
    expect(splitCountUp("38%")).toEqual({ prefix: "", value: 38, decimals: 0, grouped: false, suffix: "%" })
    expect(splitCountUp("1.2K")).toEqual({ prefix: "", value: 1.2, decimals: 1, grouped: false, suffix: "K" })
    expect(splitCountUp("-KES 2,500.50")).toEqual({ prefix: "-KES ", value: 2500.5, decimals: 2, grouped: true, suffix: "" })
  })

  it("refuses anything that isn't one number with a prefix or suffix", () => {
    expect(splitCountUp("—")).toBeNull()
    expect(splitCountUp("12 of 40")).toBeNull()
    expect(splitCountUp("2026-11-21")).toBeNull()
    expect(splitCountUp("")).toBeNull()
  })
})

describe("formatCountUp", () => {
  it("re-renders a part-way value in the original shape", () => {
    const parts = splitCountUp("KES 18,420")!
    expect(formatCountUp(parts, 9210.4)).toBe("KES 9,210")
    expect(formatCountUp(parts, 18420)).toBe("KES 18,420")
    expect(formatCountUp(splitCountUp("1.2K")!, 0.63)).toBe("0.6K")
  })
})
