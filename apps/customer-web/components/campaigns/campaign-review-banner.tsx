import Link from "next/link"
import { AlertCircle, Clock } from "lucide-react"
import type { CampaignDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"

/**
 * The advertiser's view of ops's decision. Mirrors driver-web's verification
 * status card: the review reason is rendered verbatim, because paraphrasing it
 * would leave the app disagreeing with the email that carried the same text.
 */
export function CampaignReviewBanner({ campaign }: { campaign: CampaignDto }) {
  if (campaign.status === "submitted") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">In queue for review</p>
          <p className="mt-1">
            We&apos;re checking your brief, flight window, and creative — this usually takes a day
            or two. You can&apos;t edit a campaign while it&apos;s under review.
          </p>
        </div>
      </div>
    )
  }

  if (campaign.status !== "rejected" && campaign.status !== "changes_requested") {
    return null
  }

  const rejected = campaign.status === "rejected"

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex-1">
          <p className="font-medium">
            {rejected ? "Why it wasn't approved" : "What needs to change"}
          </p>
          <p className="mt-1 whitespace-pre-line">
            {campaign.review_reason ??
              "Our team asked for changes before this can be approved."}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href={`/campaigns/new?id=${campaign.id}`}>Edit and resubmit</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
