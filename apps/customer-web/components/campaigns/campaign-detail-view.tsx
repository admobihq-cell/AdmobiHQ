"use client"

import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  FileDown,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Wallet,
} from "lucide-react"
import { exportFileName, type CampaignFormat } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import { CampaignReviewBanner } from "@/components/campaigns/campaign-review-banner"
import { CreativeUploadField } from "@/components/campaigns/creative-upload-field"
import { CampaignDetailSkeleton } from "@/components/skeletons/campaign-detail-skeleton"
import { StatCard } from "@/components/stat-card"
import { useCampaign, useDownloadPdf } from "@/lib/use-campaigns"

const FORMAT_LABELS: Record<string, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Taxi-top LED + delivery bike",
}

const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

function formatKes(value: string | null): string {
  if (!value) return "—"
  return `KES ${Number(value).toLocaleString("en-KE")}`
}

export function CampaignDetailView({ id }: { id: number }) {
  const campaignQuery = useCampaign(id)
  const downloadPdf = useDownloadPdf()

  const backLink = (
    <Link
      href="/campaigns"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to campaigns
    </Link>
  )

  // Same skeleton the route's loading.tsx renders — the server render is
  // instant, so this is the wait people actually see; a different shape here
  // would make the page shift twice.
  if (campaignQuery.isPending) return <CampaignDetailSkeleton />

  const campaign = campaignQuery.data
  if (!campaign) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {backLink}
        <p className="text-sm text-muted-foreground">
          This campaign isn&apos;t available on your account.
        </p>
      </div>
    )
  }

  const editable = EDITABLE_STATUSES.has(campaign.status)

  const detailRows = [
    { label: "Market", value: campaign.market ?? "—" },
    {
      label: "Flight",
      value:
        campaign.starts_on && campaign.ends_on
          ? `${campaign.starts_on} → ${campaign.ends_on}`
          : "Not scheduled",
    },
    { label: "Format", value: FORMAT_LABELS[campaign.format] ?? campaign.format },
    { label: "Objective", value: campaign.objective ?? "—" },
    { label: "Corridors", value: campaign.corridors ?? "—" },
  ]

  return (
    <div className="flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-3">
        {backLink}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="flex items-center gap-2">
            <CampaignStatusBadge status={campaign.status} flightPhase={campaign.flight_phase} />
            {editable ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/campaigns/new?id=${campaign.id}`}>
                  <Pencil data-icon="inline-start" />
                  Edit
                </Link>
              </Button>
            ) : null}
            {/* Only an approved, scheduled flight has a delivery record — the
                API refuses anything else, so the button isn't offered. */}
            {campaign.status === "approved" && campaign.starts_on && campaign.ends_on ? (
              <Button
                size="sm"
                variant="outline"
                loading={downloadPdf.isPending}
                loadingText="Preparing…"
                onClick={() =>
                  downloadPdf.mutate({
                    path: `/v1/customer/campaigns/${campaign.id}/proof-of-play`,
                    filename: exportFileName("proof of play", campaign.name, "pdf"),
                  })
                }
              >
                <FileDown data-icon="inline-start" />
                Proof of play
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <CampaignReviewBanner campaign={campaign} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Budget" value={formatKes(campaign.budget_kes)} icon={Wallet} />
        <StatCard
          label="Creative"
          value={`${campaign.creatives.length} file${campaign.creatives.length === 1 ? "" : "s"}`}
          icon={ImageIcon}
        />
        <StatCard
          label="Market"
          value={campaign.market ?? "—"}
          icon={MapPin}
        />
      </div>

      <Card className="shadow-none">
        <CardContent className="p-4">
          {detailRows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 border-b border-border py-2.5 text-sm last:border-0"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="max-w-[60%] text-right font-medium">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          Creative
        </h2>
        {editable ? (
          <CreativeUploadField
            campaignId={campaign.id}
            format={campaign.format as CampaignFormat}
            creatives={campaign.creatives}
          />
        ) : campaign.creatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No creative uploaded.</p>
        ) : (
          <CreativeUploadField
            campaignId={campaign.id}
            format={campaign.format as CampaignFormat}
            creatives={campaign.creatives}
            disabled
          />
        )}
      </section>
    </div>
  )
}
