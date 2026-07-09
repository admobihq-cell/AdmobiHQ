import { Suspense } from "react"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { DriversView } from "./drivers-view"
import { DRIVERS_PAGE } from "@/lib/entity-pages"
import { listDrivers } from "@/lib/queries/entities"

export default function DriversPage() {
  return (
    <Suspense fallback={<EntityPageChrome {...DRIVERS_PAGE} loading />}>
      <DriversPageContent />
    </Suspense>
  )
}

async function DriversPageContent() {
  const initialData = await listDrivers()
  return <DriversView initialData={initialData} />
}
