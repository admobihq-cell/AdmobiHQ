"use client"

import type { NamedValue } from "@workspace/ops-contracts"

import {
  DIM_TRANSITION,
  HoverTip,
  chartColor,
  defaultFormat,
  useActiveMark,
} from "@workspace/ui/components/charts/shared"
import { DeltaPill } from "@workspace/ui/components/dashboard/delta-pill"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Ranked horizontal bars on a faint track, value on the right and an optional change column.
 * Bars are one colour (the list is one measure, not a set of entities). Hovering or focusing a
 * row lifts its bar and dims the others.
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
  const max = Math.max(0, ...data.map((row) => row.value))
  const hasChange = data.some((row) => row.change !== undefined)
  const { set, opacityOf } = useActiveMark()

  return (
    <ul className={cn("flex flex-col gap-3", className)} onMouseLeave={() => set(null)}>
      {data.map((row, i) => {
        const pct = max > 0 ? (row.value / max) * 100 : 0
        return (
          <li key={row.name}>
            <HoverTip tip={`${row.name}: ${valueFormatter(row.value)}`}>
              <div
                tabIndex={0}
                onMouseEnter={() => set(i)}
                onFocus={() => set(i)}
                onBlur={() => set(null)}
                className="flex flex-col gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{row.name}</span>
                  <span className="font-medium tabular-nums">{valueFormatter(row.value)}</span>
                  {hasChange ? (
                    <span className="flex w-16 justify-end">
                      <DeltaPill delta={{ current: row.value, previous: null, change: row.change ?? null }} good="neutral" />
                    </span>
                  ) : null}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-chart-track" role="presentation">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: chartColor(0), opacity: opacityOf(i), ...DIM_TRANSITION }}
                  />
                </div>
              </div>
            </HoverTip>
          </li>
        )
      })}
    </ul>
  )
}
