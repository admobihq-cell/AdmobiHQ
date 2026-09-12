import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { AdvertiserOrgsView } from "./advertiser-orgs-view"
import { ADVERTISER_ORGS_PAGE } from "@/lib/entity-pages"
import { requireOpsPermission } from "@/lib/auth"

export default async function AdvertiserOrgsPage() {
  try {
    await requireOpsPermission("campaigns")
  } catch {
    redirect("/home")
  }

  return (
    <Suspense fallback={<EntityPageChrome {...ADVERTISER_ORGS_PAGE} loading />}>
      <AdvertiserOrgsView />
    </Suspense>
  )
}
