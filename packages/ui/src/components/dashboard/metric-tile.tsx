import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/** A small figure inside a card: label, value, and a note saying what the value means. */
export function MetricTile({
  label,
  value,
  note,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  note?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-md border bg-muted/35 px-3 py-2.5", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  )
}
