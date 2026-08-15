import Link from "next/link"
import { AlertCircle, CheckCircle2, Clock, ShieldQuestion } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const STATUS_COPY: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  approved: {
    label: "Verified",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  submitted: {
    label: "Under review",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
  rejected: {
    label: "Action needed",
    icon: AlertCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  },
  changes_requested: {
    label: "Action needed",
    icon: AlertCircle,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  },
  draft: {
    label: "Profile incomplete",
    icon: ShieldQuestion,
    className: "bg-muted text-muted-foreground",
  },
}

/** Sits above NavUser in the sidebar footer so a driver always sees their
 * verification state, regardless of which (freely-navigable) screen they're
 * on. Links to the account settings page, where the status/stepper live. */
export function VerificationBadge({ status }: { status: string | null }) {
  const copy = STATUS_COPY[status ?? "draft"] ?? STATUS_COPY.draft!
  const Icon = copy.icon

  return (
    <Link href="/settings/account" className="block px-2 group-data-[collapsible=icon]:px-0" aria-label="Account status">
      <Badge
        variant="secondary"
        className={cn(
          "w-full justify-center gap-1.5 py-1.5 group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-0",
          copy.className,
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        <span className="group-data-[collapsible=icon]:hidden">{copy.label}</span>
      </Badge>
    </Link>
  )
}
