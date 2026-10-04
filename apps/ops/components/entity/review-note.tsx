import { MessageSquareWarning } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/** The note is shown to the applicant verbatim, so it gets the weight of the
 * decision it belongs to rather than always reading as a rejection. */
export function ReviewNote({
  status,
  reason,
  audience,
}: {
  status: string
  reason: string
  audience: string
}) {
  const tone =
    status === "rejected"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : status === "changes_requested"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
        : "border-border bg-muted/40 text-foreground"

  return (
    <div className={cn("flex gap-3 rounded-xl border p-4 text-sm", tone)}>
      <MessageSquareWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">Last review note — {audience} sees this</p>
        <p className="whitespace-pre-line">{reason}</p>
      </div>
    </div>
  )
}
