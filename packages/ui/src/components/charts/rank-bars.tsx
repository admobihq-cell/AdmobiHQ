"use client"

import * as React from "react"
import type { NamedValue } from "@workspace/ops-contracts"

import { HatchPattern } from "@workspace/ui/components/charts/hatch"
import { HoverTip, chartColor, defaultFormat } from "@workspace/ui/components/charts/shared"
import { DeltaPill } from "@workspace/ui/components/dashboard/delta-pill"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Ranked horizontal bars on a hatched track, value on the right and an optional change
 * column. Bars are one colour (the list is one measure, not a set of entities).
 */
export function RankBars({
  data,
  valueFormatter = defaultFormat,
  className,
}: {
  data: (NamedValue & { change?: number | null })[]
  valueFormatter?: (value: number) => string
  className?: string
}) {
  const hatchId = `hatch-${React.useId().replace(/:/g, "")}`
  const max = Math.max(0, ...data.map((row) => row.value))
  const hasChange = data.some((row) => row.change !== undefined)

  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {data.map((row) => {
        const pct = max > 0 ? (row.value / max) * 100 : 0
        return (
          <li key={row.name}>
            <HoverTip tip={`${row.name}: ${valueFormatter(row.value)}`}>
              <div tabIndex={0} className="flex flex-col gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{row.name}</span>
                  <span className="font-medium tabular-nums">{valueFormatter(row.value)}</span>
                  {hasChange ? (
                    <span className="flex w-16 justify-end">
                      <DeltaPill delta={{ current: row.value, previous: null, change: row.change ?? null }} good="neutral" />
                    </span>
                  ) : null}
                </div>
                <svg className="h-2 w-full" role="presentation">
                  <defs>
                    <HatchPattern id={hatchId} />
                  </defs>
                  <rect width="100%" height="100%" rx={4} fill={`url(#${hatchId})`} />
                  <rect width={`${pct}%`} height="100%" rx={4} fill={chartColor(0)} />
                </svg>
              </div>
            </HoverTip>
          </li>
        )
      })}
    </ul>
  )
}
