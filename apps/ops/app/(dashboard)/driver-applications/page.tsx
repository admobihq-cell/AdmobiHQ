import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { DriverApplicationsView } from "./driver-applications-view"
import { DRIVER_APPLICATIONS_PAGE } from "@/lib/entity-pages"
import { listDriverApplications } from "@/lib/queries/entities"
import { requireOpsPermission } from "@/lib/auth"

export default async function DriverApplicationsPage() {
  try {
    await requireOpsPermission("driver_applications")
  } catch {
    redirect("/home")
  }

  return (
    <Suspense fallback={<EntityPageChrome {...DRIVER_APPLICATIONS_PAGE} loading />}>
      <DriverApplicationsPageContent />
    </Suspense>
  )
}

async function DriverApplicationsPageContent() {
  const initialData = await listDriverApplications()
  return <DriverApplicationsView initialData={initialData} />
}
