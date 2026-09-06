import type { ReactElement } from "react"

import { DataTable } from "../primitives/data-table"
import { DocumentShell } from "../primitives/document-shell"
import { SummaryList } from "../primitives/summary-list"

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

/**
 * Invoice-shaped statement: summary block, table, totals line, footnote.
 *
 * Deliberately generic over its rows the way EntityExportPdf is — the
 * advertiser's budget statement and a single campaign's proof-of-play both
 * render through it, and the routes decide what a row means.
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
  return (
    <DocumentShell title={title} subtitle={subtitle}>
      <SummaryList items={summary} />
      <DataTable headers={headers} rows={rows} totalsRow={totalsRow} />
      <span tw="text-[9px] text-gray-400 mt-4">{footnote}</span>
    </DocumentShell>
  )
}
