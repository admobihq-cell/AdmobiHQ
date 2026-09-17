import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components/card"

/** The handful of numbers a reviewer needs before scrolling — sits directly
 * under the page header on the review screens. */
export function FactStrip({ children }: { children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardContent className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{children}</CardContent>
    </Card>
  )
}

export function Fact({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-4 text-primary" aria-hidden />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
        {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  )
}
