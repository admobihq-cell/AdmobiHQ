import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { CampaignsView } from "./campaigns-view"
import { CAMPAIGNS_PAGE } from "@/lib/entity-pages"
import { listCampaigns } from "@/lib/queries/entities"
import { requireOpsPermission } from "@/lib/auth"

export default async function CampaignsPage() {
  try {
    await requireOpsPermission("campaigns")
  } catch {
    redirect("/home")
  }

  return (
    <Suspense fallback={<EntityPageChrome {...CAMPAIGNS_PAGE} loading />}>
      <CampaignsPageContent />
    </Suspense>
  )
}

async function CampaignsPageContent() {
  const initialData = await listCampaigns()
  return <CampaignsView initialData={initialData} />
}
