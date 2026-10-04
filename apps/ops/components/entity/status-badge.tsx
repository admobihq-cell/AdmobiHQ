"use client"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const statusStyles: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  open: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  qualified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  closed: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  verified: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  changes_requested: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  cancelled: "bg-muted text-muted-foreground",
  // Derived campaign flight phases — see campaign-dto.ts. Ops mostly sees the
  // review status, but these appear wherever a flight phase is surfaced.
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-secondary text-secondary-foreground",
}

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined
  className?: string
}) {
  if (!status) return <span className="text-muted-foreground">—</span>
  return (
    <Badge
      variant="secondary"
      className={cn(
        "uppercase tracking-wide",
        statusStyles[status] ?? "",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  )
}
