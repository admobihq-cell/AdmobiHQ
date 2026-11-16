import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import type { OpsClient } from "@workspace/ops-api-client"
import { cellText, exportFileName, isPdfBase64, toCsv, type DocumentExportRequest } from "@workspace/ops-contracts"

export type ExportKind = "csv" | "pdf"

export type ExportColumn<T> = { header: string; value: (row: T) => string | number | null | undefined }

/** Blob to base64 through FileReader: React Native's Blob has no `arrayBuffer()`, but reading a data URL works. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Couldn't read the PDF"))
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "")
    reader.readAsDataURL(blob)
  })
}

/**
 * Writes `rows` to a CSV or PDF in the cache folder and opens the share sheet. Exactly the rows given:
 * the visible list, or the selection (the PDF route stops at 500 rows). Same file names as ops web.
 */
export async function exportRows({
  client,
  kind,
  entity,
  title,
  headers,
  rows,
  selected,
}: {
  client: OpsClient
  kind: ExportKind
  entity: DocumentExportRequest["entity"]
  title: string
  headers: string[]
  rows: string[][]
  /** True when the rows are a selection, so the file name says so, as on the web. */
  selected?: boolean
}): Promise<void> {
  if (!rows.length) return
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device")

  const fileName = exportFileName(title, selected ? "selected" : null, kind)
  const uri = `${FileSystem.cacheDirectory}${fileName}`

  if (kind === "csv") {
    const records = rows.map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i]])))
    await FileSystem.writeAsStringAsync(uri, toCsv(records, headers), { encoding: FileSystem.EncodingType.UTF8 })
  } else {
    const base64 = await blobToBase64(await client.documents.exportPdf({ entity, title, headers, rows }))
    if (!isPdfBase64(base64)) throw new Error("The server didn't return a PDF. Try again in a moment.")
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 })
  }

  await Sharing.shareAsync(uri, {
    mimeType: kind === "csv" ? "text/csv" : "application/pdf",
    UTI: kind === "csv" ? "public.comma-separated-values-text" : "com.adobe.pdf",
    dialogTitle: `Export ${title}`,
  })
}

/** Applies the columns to the rows: the string cells both formats take. */
export function tableCells<T>(columns: ExportColumn<T>[], rows: T[]): { headers: string[]; cells: string[][] } {
  return { headers: columns.map((c) => c.header), cells: rows.map((row) => columns.map((c) => cellText(c.value(row)))) }
}
