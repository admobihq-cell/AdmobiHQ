import type { ReactElement } from "react"

import {
  BrandHeader,
  BrandPage,
  INK,
  LABEL,
  MUTED,
  NUMERIC,
  TABLE_CELL,
  TABLE_HEAD_CELL,
} from "@/lib/pdf/primitives/brand"

export type CampaignStatementPdfProps = {
  title: string
  subtitle: string
  summary: readonly { label: string; value: string }[]
  headers: string[]
  rows: string[][]
  /** Same cell count as `headers` — the invoice line that totals the column
   * above it. */
  totalsRow?: string[]
  /** Small print under the table. Both statements carry one: what the
   * document is, and what it is not. */
  footnote: string
}

/** A money, count or percentage cell — those columns align right. */
const NUMBER_CELL = /^[-−]?\s*(KES|Ksh)?\s?[-−]?[\d,]+(\.\d+)?\s?%?$/i

/**
 * Every finance statement an advertiser downloads (budget statement, monthly
 * wallet statement, proof of play, campaign report), in the same layout as
 * their invoices: Admobi header, a key/value summary, the table, and the
 * totals line as a black bar.
 *
 * Deliberately generic over its rows — the routes decide what a row means.
 */
export function CampaignStatementPdf({
  title,
  subtitle,
  summary,
  headers,
  rows,
  totalsRow,
  footnote,
}: CampaignStatementPdfProps): ReactElement {
  const numeric = headers.map((_, j) => {
    const cells = [...rows.map((row) => row[j] ?? ""), ...(totalsRow ? [totalsRow[j] ?? ""] : [])].filter((c) => c !== "")
    return cells.length > 0 && cells.every((cell) => NUMBER_CELL.test(cell))
  })
  const align = (j: number) => (numeric[j] ? NUMERIC : { textAlign: "left" as const })

  return (
    <BrandPage>
      <BrandHeader title={title} subtitle={subtitle} />

      {summary.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", width: "100%", marginBottom: 22 }}>
          {summary.map((item, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", width: "50%", paddingRight: 16, marginBottom: 12 }}>
              <span style={{ ...LABEL, color: MUTED, marginBottom: 4 }}>{item.label}</span>
              <span style={{ fontWeight: 700 }}>{item.value === "" ? "—" : item.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((header, j) => (
              <th key={j} style={{ ...TABLE_HEAD_CELL, ...align(j) }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ breakInside: "avoid" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ ...TABLE_CELL, ...align(j), fontWeight: j === 0 ? 700 : 400 }}>
                  {cell === "" ? "—" : cell}
                </td>
              ))}
            </tr>
          ))}
          {totalsRow ? (
            // A body row, painted per cell with a non-breaking space in empty cells:
            // Takumi collapses empty <tfoot> cells, which shifts the totals out of
            // their columns.
            <tr style={{ breakInside: "avoid" }}>
              {totalsRow.map((cell, j) => (
                <td
                  key={j}
                  style={{ padding: "11px 10px", fontWeight: 700, backgroundColor: INK, color: "#ffffff", ...align(j) }}
                >
                  {cell === "" ? " " : cell}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>

      <span style={{ fontSize: 9, color: MUTED, marginTop: 16, lineHeight: 1.5 }}>{footnote}</span>
    </BrandPage>
  )
}
