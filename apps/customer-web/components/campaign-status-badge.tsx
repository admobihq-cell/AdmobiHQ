import type { CampaignFlightPhase } from "@workspace/ops-contracts"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Advertisers see one badge combining two facts: an approved campaign shows
 * where it sits in its flight (Scheduled / Live / Completed), and everything
 * else shows where it sits in review. Ops sees the raw status instead — a
 * reviewer needs "submitted", an advertiser is better served by "In queue".
 */

const REVIEW_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  changes_requested: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  cancelled: "bg-muted text-muted-foreground",
}

const REVIEW_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "In queue",
  rejected: "Rejected",
  changes_requested: "Changes needed",
  cancelled: "Cancelled",
}

const PHASE_STYLES: Record<CampaignFlightPhase, string> = {
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-secondary text-secondary-foreground",
  unscheduled: "bg-muted text-muted-foreground",
}

const PHASE_LABELS: Record<CampaignFlightPhase, string> = {
  live: "Live",
  scheduled: "Scheduled",
  completed: "Completed",
  unscheduled: "Approved",
}

export function campaignBadgeLabel(status: string, flightPhase: CampaignFlightPhase): string {
  if (status === "approved") return PHASE_LABELS[flightPhase]
  return REVIEW_LABELS[status] ?? status.replace(/_/g, " ")
}

export function CampaignStatusBadge({
  status,
  flightPhase,
  className,
}: {
  status: string
  flightPhase: CampaignFlightPhase
  className?: string
}) {
  const approved = status === "approved"
  return (
    <Badge
      variant="secondary"
      className={cn(
        "uppercase tracking-wide",
        approved ? PHASE_STYLES[flightPhase] : (REVIEW_STYLES[status] ?? ""),
        className,
      )}
    >
      {campaignBadgeLabel(status, flightPhase)}
    </Badge>
  )
}
