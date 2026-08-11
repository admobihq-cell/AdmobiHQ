import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { DriversView } from "./drivers-view"
import { DRIVERS_PAGE } from "@/lib/entity-pages"
import { listDrivers } from "@/lib/queries/entities"
import { requireOpsPermission } from "@/lib/auth"

export default async function DriversPage() {
  try {
    await requireOpsPermission("drivers")
  } catch {
    redirect("/home")
  }

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
