"use client"

import { HoverTip, defaultFormat } from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

export type HeatmapCell = { row: string; column: string; value: number | null }

/**
 * A generic row × column grid in one hue. Every cell prints its value, so shade is a hint and
 * never the only encoding. CSS grid rather than Recharts; scrolls inside its own box on a phone.
 */
export function Heatmap({
  rows,
  columns,
  cells,
  valueFormatter = defaultFormat,
  className,
}: {
  rows: string[]
  columns: string[]
  cells: HeatmapCell[]
  valueFormatter?: (value: number) => string
  className?: string
}) {
  const lookup = new Map(cells.map((cell) => [`${cell.row}\u0000${cell.column}`, cell.value]))
  const max = Math.max(0, ...cells.map((cell) => cell.value ?? 0))

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div
        role="table"
        aria-label="Heatmap"
        className="grid min-w-max gap-0.5 text-xs"
        style={{ gridTemplateColumns: `minmax(6rem, auto) repeat(${columns.length}, minmax(3.25rem, 1fr))` }}
      >
        <div role="row" className="contents">
          <span role="columnheader" className="sr-only">
            Row
          </span>
          {columns.map((column) => (
            <span key={column} role="columnheader" className="px-1 pb-1 text-center text-muted-foreground">
              {column}
            </span>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row} role="row" className="contents">
            <span role="rowheader" className="flex items-center pr-2 text-muted-foreground">
              {row}
            </span>
            {columns.map((column) => {
              const value = lookup.get(`${row}\u0000${column}`) ?? null
              const intensity = value !== null && max > 0 ? Math.max(6, Math.round((value / max) * 70)) : 0
              return (
                <HoverTip key={column} tip={`${row} · ${column}: ${value === null ? "no data" : valueFormatter(value)}`}>
                  <span
                    role="cell"
                    tabIndex={0}
                    className="flex h-9 items-center justify-center rounded-sm border border-transparent tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      background: intensity
                        ? `color-mix(in oklch, var(--chart-1) ${intensity}%, transparent)`
                        : "var(--muted)",
                    }}
                  >
                    {value === null ? "—" : valueFormatter(value)}
                  </span>
                </HoverTip>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
