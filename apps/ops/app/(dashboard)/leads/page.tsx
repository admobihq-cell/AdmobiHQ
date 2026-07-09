import { Suspense } from "react"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { LeadsView } from "./leads-view"
import { LEADS_PAGE } from "@/lib/entity-pages"
import { listLeads } from "@/lib/queries/entities"

export default function LeadsPage() {
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
