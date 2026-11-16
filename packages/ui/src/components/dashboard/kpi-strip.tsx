import type * as React from "react"
import type { Delta } from "@workspace/ops-contracts"

import { Card } from "@workspace/ui/components/card"
import {
  DeltaPill,
  type DeltaGood,
} from "@workspace/ui/components/dashboard/delta-pill"
import { cn } from "@workspace/ui/lib/utils"

export type KpiItem = {
  label: React.ReactNode
  value: React.ReactNode
  note?: React.ReactNode
  delta?: { delta: Delta; good: DeltaGood; format?: (change: number) => string }
  icon?: React.ReactNode
}

// Static class names so Tailwind can see them. Stacks to 1 column on phone, 2 on tablet.
const COLUMNS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
} as const

/** One card divided into cells, not separate cards. Hairlines come from the cell borders. */
export function KpiStrip({
  items,
  columns,
  className,
}: {
  items: KpiItem[]
  columns?: keyof typeof COLUMNS
  className?: string
}) {
  const cols = columns ?? (Math.min(Math.max(items.length, 2), 5) as keyof typeof COLUMNS)

  return (
    <Card className={cn("gap-0 py-0 shadow-xs", className)}>
      {/* -m-px hides the outer border of the last row and column. */}
      <div className={cn("-mr-px -mb-px grid grid-cols-1", COLUMNS[cols])}>
        {items.map((item, index) => (
          <div key={index} className="border-r border-b p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              {item.icon ? (
                <span className="text-muted-foreground [&>svg]:size-4" aria-hidden>
                  {item.icon}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-2xl leading-tight font-semibold tabular-nums">
                {item.value}
              </p>
              {item.delta ? <DeltaPill {...item.delta} /> : null}
            </div>
            {item.note ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  )
}
