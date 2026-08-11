import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { FleetView } from "./fleet-view"
import { FLEET_PAGE } from "@/lib/entity-pages"
import { listFleetPartners } from "@/lib/queries/entities"
import { requireOpsPermission } from "@/lib/auth"

export default async function FleetPage() {
  try {
    await requireOpsPermission("fleet")
  } catch {
    redirect("/home")
  }

  return (
    <Suspense fallback={<EntityPageChrome {...FLEET_PAGE} loading />}>
      <FleetPageContent />
    </Suspense>
  )
}

async function FleetPageContent() {
  const initialData = await listFleetPartners()
  return <FleetView initialData={initialData} />
}
