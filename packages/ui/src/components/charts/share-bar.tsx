"use client"

import type { NamedValue } from "@workspace/ops-contracts"

import { HoverTip, chartColor, defaultFormat } from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

/**
 * One segmented bar plus a legend row per segment. Segments keep input order and colour by
 * position (never sorted at render), with a 2px gap so neighbours stay apart.
 */
export function ShareBar({
  data,
  valueFormatter = defaultFormat,
  className,
}: {
  data: NamedValue[]
  valueFormatter?: (value: number) => string
  className?: string
}) {
  const total = data.reduce((sum, row) => sum + row.value, 0)
  const share = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="img"
        aria-label={data.map((row) => `${row.name} ${share(row.value)}%`).join(", ")}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {data
          .map((row, i) => ({ row, i }))
          .filter(({ row }) => row.value > 0)
          .map(({ row, i }) => (
            <HoverTip key={row.name} tip={`${row.name}: ${valueFormatter(row.value)} (${share(row.value)}%)`}>
              <div
                tabIndex={0}
                className="h-full min-w-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ width: `${(row.value / total) * 100}%`, background: chartColor(i) }}
              />
            </HoverTip>
          ))}
      </div>
      <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
        {data.map((row, i) => (
          <li key={row.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: chartColor(i) }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            <span className="tabular-nums">{valueFormatter(row.value)}</span>
            <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{share(row.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
