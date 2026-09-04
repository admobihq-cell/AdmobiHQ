import { describe, expect, it } from "vitest"

import { renderPdf } from "../render-pdf"
import { EntityExportPdf } from "./entity-export-pdf"

describe("EntityExportPdf", () => {
  it("renders a titled table export to non-empty PDF bytes", async () => {
    const bytes = await renderPdf(
      <EntityExportPdf
        title="Drivers"
        headers={["Name", "City", "Status"]}
        rows={[
          ["Amina Wanjiru", "Nairobi", "active"],
          ["Otieno Odhiambo", "Mombasa", "pending"],
        ]}
        generatedAt="4 Sep 2026"
      />,
    )

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it("renders correctly with zero rows", async () => {
    const bytes = await renderPdf(
      <EntityExportPdf title="Drivers" headers={["Name"]} rows={[]} generatedAt="4 Sep 2026" />,
    )
    expect(bytes.length).toBeGreaterThan(0)
  })
})
