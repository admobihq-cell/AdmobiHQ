import type { ReactElement } from "react"
import { BRAND_COLOR, BRAND_COLOR_LIGHT } from "@/lib/pdf/render-pdf"

/** Generic header-row + data-rows table. Every cell is a plain string —
 * callers format numbers/dates/labels before passing them in, the same
 * way apps/ops/lib/format.ts's toCsv() expects pre-formatted cell text.
 * Uses real <table>/<thead>/<tbody> markup rather than flex divs: Takumi
 * repeats a <thead> at the top of every page a table continues onto, and
 * keeps column x-positions aligned across pages — a flex-div table would
 * lose its header past page 1, and ops exports can run to hundreds of
 * rows. */
export function DataTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}): ReactElement {
  return (
    <table tw="w-full border border-gray-200 text-[10px]" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ backgroundColor: BRAND_COLOR_LIGHT }}>
          {headers.map((header, i) => (
            <th
              key={i}
              tw="p-2 text-left font-semibold border-b"
              style={{ color: BRAND_COLOR, borderColor: BRAND_COLOR }}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} tw={i % 2 === 1 ? "bg-gray-50" : ""}>
            {row.map((cell, j) => (
              <td key={j} tw="p-2 text-gray-800 border-b border-gray-100">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
