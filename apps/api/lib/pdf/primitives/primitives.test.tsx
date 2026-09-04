import { describe, expect, it } from "vitest"

import { renderPdf } from "../render-pdf"
import { DataTable } from "./data-table"
import { DocumentShell } from "./document-shell"

describe("pdf primitives", () => {
  it("DocumentShell + DataTable render together to non-empty PDF bytes", async () => {
    const bytes = await renderPdf(
      <DocumentShell title="Test export" subtitle="2 records">
        <DataTable
          headers={["Name", "City"]}
          rows={[
            ["Amina", "Nairobi"],
            ["Otieno", "Mombasa"],
          ]}
        />
      </DocumentShell>,
    )

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })
})
