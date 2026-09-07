"use client"

import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { CampaignWizard } from "@/components/campaigns/campaign-wizard"
import {
  NewCampaignChrome as Screen,
  NewCampaignSkeleton,
} from "@/components/campaigns/new-campaign-chrome"
import { useCampaign } from "@/lib/use-campaigns"

const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

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
    return <NewCampaignSkeleton />
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
