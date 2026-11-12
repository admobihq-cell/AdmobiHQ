import { describe, expect, it } from "vitest"

import { cellText, isPdfBase64 } from "./export-ui"

describe("isPdfBase64", () => {
  it("accepts a real PDF header and refuses an HTML error page", () => {
    expect(isPdfBase64(Buffer.from("%PDF-1.7\n...").toString("base64"))).toBe(true)
    expect(isPdfBase64(Buffer.from("<html>502 Bad Gateway</html>").toString("base64"))).toBe(false)
    expect(isPdfBase64("")).toBe(false)
  })
})

describe("cellText", () => {
  it("turns missing values into empty cells, not the word null", () => {
    expect(cellText(null)).toBe("")
    expect(cellText(undefined)).toBe("")
    expect(cellText(0)).toBe("0")
    expect(cellText("Nairobi")).toBe("Nairobi")
  })
})
