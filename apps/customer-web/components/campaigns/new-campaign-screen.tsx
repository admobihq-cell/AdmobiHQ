"use client"

import Link from "next/link"
import { X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Logo } from "@workspace/ui/brand/logo"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { CampaignWizard } from "@/components/campaigns/campaign-wizard"
import { useCampaign } from "@/lib/use-campaigns"

const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

/** Full-screen chrome for the campaign wizard: the same sticky logo bar and
 * centred column driver-web uses for profile setup, so the two flows feel like
 * one product. */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-8">
        <Logo markHeight={18} wordmarkClassName="text-sm font-semibold leading-none" />
        <Button variant="ghost" size="icon-sm" asChild aria-label="Close">
          <Link href="/campaigns">
            <X aria-hidden />
          </Link>
        </Button>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>
    </div>
  )
}

export function NewCampaignScreen({
  campaignId,
  initialStartsOn,
  initialEndsOn,
}: {
  campaignId: number | null
  initialStartsOn: string | null
  initialEndsOn: string | null
}) {
  const campaignQuery = useCampaign(campaignId)

  if (campaignId != null && campaignQuery.isPending) {
    return (
      <Screen>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Screen>
    )
  }

  const campaign = campaignQuery.data ?? null

  if (campaignId != null && !campaign) {
    return (
      <Screen>
        <div className="space-y-4 text-center">
          <h1 className="text-lg font-semibold">Campaign not found</h1>
          <p className="text-sm text-muted-foreground">
            It may have been deleted, or it belongs to another account.
          </p>
          <Button asChild>
            <Link href="/campaigns">Back to campaigns</Link>
          </Button>
        </div>
      </Screen>
    )
  }

  // A campaign under review or already approved can't be edited — the API
  // returns 409, so refuse here rather than letting someone fill in a form
  // that can't save.
  if (campaign && !EDITABLE_STATUSES.has(campaign.status)) {
    return (
      <Screen>
        <div className="space-y-4 text-center">
          <h1 className="text-lg font-semibold">This campaign can&apos;t be edited</h1>
          <p className="text-sm text-muted-foreground">
            {campaign.status === "submitted"
              ? "It's in the queue for review. We'll let you know as soon as there's a decision."
              : "Approved campaigns are locked. Talk to your account manager if something needs to change."}
          </p>
          <Button asChild>
            <Link href={`/campaigns/${campaign.id}`}>View campaign</Link>
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <CampaignWizard
        initialCampaign={campaign}
        initialStartsOn={initialStartsOn}
        initialEndsOn={initialEndsOn}
      />
    </Screen>
  )
}
