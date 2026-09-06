import { describe, expect, it } from "vitest"

import { renderPdf } from "../render-pdf"
import { CampaignStatementPdf } from "./campaign-statement-pdf"

/** The summary block and the totals <tfoot> are markup no other template
 * uses, so these cover "Takumi can actually lay this out", not just the row
 * building (which campaign-statement.test.ts covers on its own). */
describe("CampaignStatementPdf", () => {
  const base = {
    subtitle: "3 campaigns · generated 6 Sep 2026",
    summary: [
      { label: "Account", value: "brand@example.com" },
      { label: "Active budget", value: "KES 120,000" },
      // Empty values fall back to an em dash in both primitives — covered here
      // because an uncovered glyph is a render-time throw, not a bad layout.
      { label: "Market", value: "" },
    ],
    headers: ["Campaign", "Flight", "Budget"],
    rows: [
      ["Kilimani Launch", "2026-10-01 to 2026-10-05", "KES 120,000"],
      ["Undated draft", "", ""],
    ],
    footnote: "Not a tax invoice.",
  }

  it("renders a summary block, table and totals row to non-empty PDF bytes", async () => {
    const bytes = await renderPdf(
      <CampaignStatementPdf
        title="Campaign budget statement"
        {...base}
        totalsRow={["Total, all campaigns", "", "KES 120,000"]}
      />,
    )

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it("renders without a totals row and with no rows at all", async () => {
    const bytes = await renderPdf(
      <CampaignStatementPdf title="Proof of play" {...base} rows={[]} />,
    )
    expect(bytes.length).toBeGreaterThan(0)
  })
})
