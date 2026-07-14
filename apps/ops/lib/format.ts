export {
  formatBytes,
  formatDate,
  formatDateTime,
  formatLabel,
  truncate,
} from "@workspace/ops-contracts/format"

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const header = columns.join(",")
  const body = rows.map((row) => columns.map((c) => escape(row[c])).join(","))
  return [header, ...body].join("\n")
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
