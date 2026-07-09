import { Suspense } from "react"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { FleetView } from "./fleet-view"
import { FLEET_PAGE } from "@/lib/entity-pages"
import { listFleetPartners } from "@/lib/queries/entities"

export default function FleetPage() {
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
