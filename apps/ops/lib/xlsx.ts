// Plain CSV can't carry any visual styling — no colors, no fonts, no
// striping, in any spreadsheet app. This builds a real .xlsx instead,
// styled to match the PDF export's brand look. Dynamically imported so
// exceljs (a few hundred KB) only loads when someone actually exports.
const BRAND_COLOR = "FFB45309"
const BRAND_COLOR_LIGHT = "FFFEF3E2"
const STRIPE_COLOR = "FFF9FAFB"

export async function buildStyledXlsx(
  title: string,
  headers: string[],
  rows: string[][],
): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(title.slice(0, 31) || "Export")

  sheet.columns = headers.map((header, i) => ({
    width: Math.min(
      Math.max(header.length, ...rows.map((r) => (r[i] ?? "").length)) + 2,
      40,
    ),
  }))

  const headerRow = sheet.addRow(headers)
  headerRow.height = 20
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BRAND_COLOR } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_COLOR_LIGHT } }
    cell.border = { bottom: { style: "thin", color: { argb: BRAND_COLOR } } }
  })

  rows.forEach((row, i) => {
    const excelRow = sheet.addRow(row.map((cell) => (cell === "" ? "—" : cell)))
    if (i % 2 === 1) {
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE_COLOR } }
      })
    }
  })

  sheet.views = [{ state: "frozen", ySplit: 1 }]

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
