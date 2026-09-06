import { notFound, redirect } from "next/navigation"

import { CampaignDetailView } from "./campaign-detail-view"
import { requireOpsPermission } from "@/lib/auth"

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    await requireOpsPermission("campaigns")
  } catch {
    redirect("/home")
  }

  const { id } = await params
  const campaignId = Number(id)
  if (!Number.isFinite(campaignId) || campaignId <= 0) notFound()

  return <CampaignDetailView campaignId={campaignId} />
}
