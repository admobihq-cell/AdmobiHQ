import type * as React from "react"
import type { Delta } from "@workspace/ops-contracts"

import { Sparkline } from "@workspace/ui/components/charts/sparkline"
import {
  DeltaPill,
  type DeltaGood,
} from "@workspace/ui/components/dashboard/delta-pill"

export type HeroDelta = {
  label: string
  delta: Delta
  good: DeltaGood
  format?: (change: number) => string
}

/** The one headline figure of a page: value, comparisons, a note, and an optional trend line. */
export function HeroMetric({
  label,
  value,
  deltas = [],
  note,
  series,
}: {
  label: React.ReactNode
  value: React.ReactNode
  deltas?: HeroDelta[]
  note?: React.ReactNode
  series?: { day: string; value: number | null }[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
          {value}
        </p>
      </div>
      {deltas.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {deltas.map((d) => (
            <span key={d.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DeltaPill delta={d.delta} good={d.good} format={d.format} />
              {d.delta.change === null ? null : d.label}
            </span>
          ))}
        </div>
      ) : null}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {series && series.length > 1 ? (
        <Sparkline data={series} dataKey="value" label={typeof label === "string" ? label : undefined} />
      ) : null}
    </div>
  )
}
