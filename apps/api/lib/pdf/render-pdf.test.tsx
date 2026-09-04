import { describe, expect, it } from "vitest"

import { renderPdf } from "./render-pdf"

describe("renderPdf", () => {
  it("renders a minimal element to non-empty PDF bytes", async () => {
    const bytes = await renderPdf(
      <div tw="flex p-4 text-[12px]" style={{ color: "#b45309" }}>
        Admobi PDF spike
      </div>,
    )

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)

    // Every valid PDF file starts with this literal magic header.
    const header = Buffer.from(bytes.slice(0, 5)).toString("ascii")
    expect(header).toBe("%PDF-")
  })
})
