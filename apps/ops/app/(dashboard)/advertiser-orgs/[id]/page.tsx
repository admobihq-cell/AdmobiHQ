import { notFound, redirect } from "next/navigation"

import { AdvertiserOrgDetailView } from "./advertiser-org-detail-view"
import { requireOpsPermission } from "@/lib/auth"

export default async function AdvertiserOrgDetailPage({
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
  const orgId = Number(id)
  if (!Number.isFinite(orgId) || orgId <= 0) notFound()

  return <AdvertiserOrgDetailView orgId={orgId} />
}
