import type * as React from "react"
import type { Delta } from "@workspace/ops-contracts"

import { Card } from "@workspace/ui/components/card"
import {
  DeltaPill,
  type DeltaGood,
} from "@workspace/ui/components/dashboard/delta-pill"
import { cn } from "@workspace/ui/lib/utils"
import { CountUp } from "@workspace/ui/components/dashboard/count-up"

export type KpiItem = {
  label: React.ReactNode
  value: React.ReactNode
  note?: React.ReactNode
  delta?: { delta: Delta; good: DeltaGood; format?: (change: number) => string }
  icon?: React.ReactNode
  /** `cards` only: makes the card a link to the section behind the number. */
  href?: string
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
  variant = "strip",
  LinkComponent = "a",
}: {
  items: KpiItem[]
  columns?: keyof typeof COLUMNS
  className?: string
  /** `strip`: one card divided into cells. `cards`: a separate soft tile per figure. */
  variant?: "strip" | "cards"
  /** Router link for `cards` items with an `href`; defaults to a plain anchor. */
  LinkComponent?: React.ElementType
}) {
  const cols = columns ?? (Math.min(Math.max(items.length, 2), 5) as keyof typeof COLUMNS)

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 gap-3", COLUMNS[cols], className)}>
        {items.map((item, index) => {
          const Tile = item.href ? LinkComponent : "div"
          return (
            <Tile
              key={index}
              {...(item.href ? { href: item.href } : {})}
              className={cn(
                "group @container flex flex-col gap-3 rounded-2xl bg-muted/60 p-4 transition-colors",
                item.href &&
                  "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              )}
            >
              {item.icon ? (
                <span
                  className="flex size-9 items-center justify-center rounded-xl bg-background text-foreground shadow-xs transition-transform duration-200 ease-out group-hover:-translate-y-0.5 [&>svg]:size-4"
                  aria-hidden
                >
                  {item.icon}
                </span>
              ) : null}
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-2xl leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums @[12rem]:text-[1.75rem]">
                    <CountUp value={item.value} />
                  </p>
                  {item.delta ? <DeltaPill {...item.delta} className="h-6 px-2" /> : null}
                </div>
                {item.note ? <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p> : null}
              </div>
            </Tile>
          )
        })}
      </div>
    )
  }

  return (
    <Card className={cn("gap-0 py-0 shadow-xs", className)}>
      {/* -m-px hides the outer border of the last row and column. */}
      <div className={cn("-mr-px -mb-px grid grid-cols-1", COLUMNS[cols])}>
        {items.map((item, index) => (
          // @container: the value sizes to its own cell, so "KES 3,935,100" never wraps in a narrow one.
          <div key={index} className="@container border-r border-b p-4 transition-colors hover:bg-muted/30">
            <div className="flex items-center gap-2.5">
              {item.icon ? (
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80 [&>svg]:size-4"
                  aria-hidden
                >
                  {item.icon}
                </span>
              ) : null}
              <p className="text-sm text-muted-foreground">{item.label}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-xl leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums @[13rem]:text-2xl">
                <CountUp value={item.value} />
              </p>
              {item.delta ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DeltaPill {...item.delta} />
                  {item.delta.delta.change === null ? null : "vs last period"}
                </span>
              ) : null}
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
