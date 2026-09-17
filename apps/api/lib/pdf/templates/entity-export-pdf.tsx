import type { ReactElement } from "react"

import { DataTable } from "../primitives/data-table"
import { DocumentShell } from "../primitives/document-shell"

export type EntityExportPdfProps = {
  title: string
  headers: string[]
  rows: string[][]
  generatedAt: string
}

export function EntityExportPdf({
  title,
  headers,
  rows,
  generatedAt,
}: EntityExportPdfProps): ReactElement {
  const recordCount = `${rows.length} record${rows.length === 1 ? "" : "s"}`
  return (
    <DocumentShell title={title} subtitle={`${recordCount} · generated ${generatedAt}`}>
      <DataTable headers={headers} rows={rows} />
    </DocumentShell>
  )
}
