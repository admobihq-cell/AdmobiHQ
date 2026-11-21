import type * as React from "react"
import type { Delta } from "@workspace/ops-contracts"

import { Sparkline } from "@workspace/ui/components/charts/sparkline"
import { CountUp } from "@workspace/ui/components/dashboard/count-up"
import { DeltaPill, type DeltaGood } from "@workspace/ui/components/dashboard/delta-pill"
import { cn } from "@workspace/ui/lib/utils"

export type StatRow = {
  icon: React.ReactNode
  label: React.ReactNode
  value: React.ReactNode
  note?: React.ReactNode
  delta?: { delta: Delta; good: DeltaGood; format?: (change: number) => string }
  /** A small trend under the value, in the de-emphasis hue. */
  series?: { day: string; value: number | null }[]
}

/**
 * Several related figures in one card, one row each: an icon tile, the label and what it means,
 * then the value (counting up) with its change. Replaces a grid of separate stat cards when the
 * figures belong together (a cash position, a funnel's headline numbers).
 */
export function StatList({ rows, className }: { rows: StatRow[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col divide-y", className)}>
      {rows.map((row, index) => (
        <li key={index} className="@container flex gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80 [&>svg]:size-4"
            aria-hidden
          >
            {row.icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm text-muted-foreground">{row.label}</p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-lg leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums @[16rem]:text-xl">
                <CountUp value={row.value} />
              </p>
              {row.delta ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DeltaPill {...row.delta} />
                  {row.delta.delta.change === null ? null : "vs last period"}
                </span>
              ) : null}
            </div>
            {row.note ? <p className="text-xs text-muted-foreground">{row.note}</p> : null}
            {row.series && row.series.length > 1 ? (
              <Sparkline data={row.series} dataKey="value" label={typeof row.label === "string" ? row.label : undefined} />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
