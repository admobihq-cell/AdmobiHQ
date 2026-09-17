import { describe, expect, it } from "vitest"

import { exportFileName, slugifyForFilename } from "./format"

const AT = new Date(2026, 8, 6) // 6 Sep 2026, local time

describe("slugifyForFilename", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyForFilename("Nairobi Launch")).toBe("nairobi-launch")
  })

  it("folds diacritics rather than dropping the letter", () => {
    expect(slugifyForFilename("Nairóbi Café")).toBe("nairobi-cafe")
  })

  it("collapses runs of punctuation and trims the edges", () => {
    expect(slugifyForFilename("  --Q4 // Promo!!  ")).toBe("q4-promo")
  })

  it("returns empty when nothing survives, so callers can omit the segment", () => {
    expect(slugifyForFilename("🚕🚕🚕")).toBe("")
    expect(slugifyForFilename("")).toBe("")
    expect(slugifyForFilename(null)).toBe("")
  })

  it("truncates without leaving a trailing hyphen", () => {
    const slug = slugifyForFilename("a".repeat(50) + " " + "b".repeat(50), 51)
    expect(slug).toBe("a".repeat(50))
    expect(slug.endsWith("-")).toBe(false)
  })

  it("strips characters that would break a Content-Disposition header", () => {
    // A campaign name is user input and lands in an HTTP header — quotes,
    // semicolons, newlines and path separators must not survive.
    const slug = slugifyForFilename('evil"; filename="x\r\n../../etc/passwd')
    expect(slug).toBe("evil-filename-x-etc-passwd")
    expect(slug).not.toMatch(/["\r\n;/\\]/)
  })
})

describe("exportFileName", () => {
  it("builds kind + subject + date", () => {
    expect(exportFileName("proof of play", "Nairobi Launch", "pdf", AT)).toBe(
      "proof-of-play-nairobi-launch-2026-09-06.pdf",
    )
  })

  it("omits the subject when there isn't one", () => {
    expect(exportFileName("drivers", null, "csv", AT)).toBe("drivers-2026-09-06.csv")
  })

  it("omits an unslugifiable subject rather than emitting a double hyphen", () => {
    expect(exportFileName("proof of play", "🚕", "pdf", AT)).toBe(
      "proof-of-play-2026-09-06.pdf",
    )
  })

  it("tolerates an extension given with a leading dot", () => {
    expect(exportFileName("drivers", null, ".xlsx", AT)).toBe("drivers-2026-09-06.xlsx")
  })

  it("uses the local date, not UTC — 01:00 in Nairobi is still today", () => {
    // 2026-09-06T01:00 local (EAT, UTC+3) is 2026-09-05T22:00Z. Naively using
    // toISOString() would stamp this file with the previous day.
    const earlyMorning = new Date(2026, 8, 6, 1, 0, 0)
    expect(exportFileName("statement", null, "pdf", earlyMorning)).toContain("2026-09-06")
  })

  it("produces a name safe to interpolate into a header", () => {
    const name = exportFileName("proof of play", 'a"; x=1', "pdf", AT)
    expect(name).toMatch(/^[a-z0-9.-]+$/)
  })
})
