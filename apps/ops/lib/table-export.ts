import { toast } from "sonner"

import { formatApiError, type OpsClient } from "@workspace/ops-api-client"
import {
  exportFileName,
  type DocumentExportRequest,
} from "@workspace/ops-contracts"

import { downloadBlob, downloadCsv, downloadPdf, toCsv } from "@/lib/format"
import { buildStyledXlsx } from "@/lib/xlsx"

export type ExportFormat = "csv" | "pdf" | "xlsx"

export type ExportColumn<T> = {
  key: string
  header: string
  value: (row: T) => string | number | null
}

/** Exports exactly the rows given — the visible page, or the selection. Not a
 * full-dataset export (the PDF route caps rows at 500 for the same reason). */
export async function exportTableRows<T>({
  format,
  title,
  scope,
  columns,
  rows,
  entity,
  client,
}: {
  format: ExportFormat
  title: string
  scope: "selected" | null
  columns: ExportColumn<T>[]
  rows: T[]
  entity: DocumentExportRequest["entity"]
  client: OpsClient
}): Promise<void> {
  if (!rows.length) return
  const headers = columns.map((c) => c.header)
  const cells = () =>
    rows.map((row) => columns.map((c) => String(c.value(row) ?? "")))

  try {
    if (format === "csv") {
      const records = rows.map((row) =>
        Object.fromEntries(columns.map((c) => [c.key, c.value(row)]))
      )
      downloadCsv(
        exportFileName(title, scope, "csv"),
        toCsv(
          records,
          columns.map((c) => c.key)
        )
      )
    } else if (format === "pdf") {
      const blob = await client.documents.exportPdf({
        entity,
        title,
        headers,
        rows: cells(),
      })
      downloadPdf(exportFileName(title, scope, "pdf"), blob)
    } else {
      const blob = await buildStyledXlsx(title, headers, cells())
      downloadBlob(exportFileName(title, scope, "xlsx"), blob)
    }
  } catch (e) {
    toast.error(formatApiError(e))
    return
  }

  if (scope === "selected") {
    toast.success(
      `Exported ${rows.length} record${rows.length === 1 ? "" : "s"}`
    )
  }
}
