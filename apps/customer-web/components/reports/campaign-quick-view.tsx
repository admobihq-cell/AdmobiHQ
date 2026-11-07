"use client"

import Link from "next/link"
import { formatKes, type ReportCampaignRowDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  HEALTH_LABEL,
  HEALTH_TONE,
  PHASE_LABEL,
  compactOrDash,
  percentOrDash,
  rangeText,
} from "@/components/reports/format"

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

/** A short summary of one campaign, with a way into its full report. */
export function CampaignQuickView({
  campaign,
  onClose,
}: {
  campaign: ReportCampaignRowDto | null
  onClose: () => void
}) {
  return (
    <Sheet open={campaign !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {campaign ? (
          <>
            <SheetHeader>
              <SheetTitle>{campaign.name}</SheetTitle>
              <SheetDescription>
                {campaign.phase ? PHASE_LABEL[campaign.phase] : campaign.status}
                {campaign.market ? ` · ${campaign.market}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">
              <div className="flex flex-col items-start gap-1.5 rounded-md border bg-muted/20 p-3">
                <StatusPill tone={HEALTH_TONE[campaign.health.level]}>{HEALTH_LABEL[campaign.health.level]}</StatusPill>
                <p className="text-sm">{campaign.health.reason}</p>
                {campaign.health.nextAction ? (
                  <p className="text-xs text-muted-foreground">Next: {campaign.health.nextAction}</p>
                ) : null}
              </div>
              <dl>
                <Fact label="Flight">
                  {campaign.startsOn && campaign.endsOn ? `${campaign.startsOn} to ${campaign.endsOn}` : "Not scheduled"}
                </Fact>
                <Fact label="Delivery rate">{percentOrDash(campaign.deliveryRate)}</Fact>
                <Fact label="Plays delivered">{campaign.playsDelivered.toLocaleString("en-KE")}</Fact>
                <Fact label="Est. impressions">
                  {compactOrDash(campaign.impressions.likely)}
                  {rangeText(campaign.impressions.low, campaign.impressions.high) ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {rangeText(campaign.impressions.low, campaign.impressions.high)}
                    </span>
                  ) : null}
                </Fact>
                {campaign.budgetKes !== null ? <Fact label="Budget">{formatKes(campaign.budgetKes)}</Fact> : null}
                {campaign.spentKes !== null ? <Fact label="Spent">{formatKes(campaign.spentKes)}</Fact> : null}
                {campaign.costPerThousandKes !== null ? (
                  <Fact label="Cost per 1,000">{formatKes(campaign.costPerThousandKes)}</Fact>
                ) : null}
              </dl>
              <Button asChild>
                <Link href={`/reports/campaigns/${campaign.id}`}>Open full report</Link>
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
