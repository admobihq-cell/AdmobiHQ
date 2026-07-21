import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import type { CampaignStatus } from "@/lib/placeholder-data"

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  scheduled:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  draft: "bg-muted text-muted-foreground",
  completed: "bg-secondary text-secondary-foreground",
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  draft: "Draft",
  completed: "Completed",
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn("uppercase tracking-wide", STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
