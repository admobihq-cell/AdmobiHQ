import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { LeadsView } from "./leads-view"
import { LEADS_PAGE } from "@/lib/entity-pages"
import { listLeads } from "@/lib/queries/entities"
import { requireOpsPermission } from "@/lib/auth"

export default async function LeadsPage() {
  try {
    await requireOpsPermission("leads")
  } catch {
    redirect("/home")
  }

  return (
    <Suspense fallback={<EntityPageChrome {...LEADS_PAGE} loading />}>
      <LeadsPageContent />
    </Suspense>
  )
}

async function LeadsPageContent() {
  const initialData = await listLeads()
  return <LeadsView initialData={initialData} />
}
