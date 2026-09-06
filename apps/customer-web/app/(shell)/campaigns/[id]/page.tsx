import { notFound } from "next/navigation"

import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view"

export const metadata = { title: "Campaign details" }

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const campaignId = Number(id)
  // Campaign ids are numeric now that campaigns live in the database; a
  // non-numeric path segment can never match one.
  if (!Number.isFinite(campaignId) || campaignId <= 0) notFound()
  return <CampaignDetailView id={campaignId} />
}
