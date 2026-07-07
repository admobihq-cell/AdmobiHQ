"use client"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const statusStyles: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  qualified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  closed: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  verified: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
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
      className={cn("capitalize", statusStyles[status] ?? "", className)}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  )
}
