import { Suspense } from "react"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { WaitlistView } from "./waitlist-view"
import { WAITLIST_PAGE } from "@/lib/entity-pages"
import { listWaitlist } from "@/lib/queries/entities"

export default function WaitlistPage() {
  return (
    <Suspense fallback={<EntityPageChrome {...WAITLIST_PAGE} loading />}>
      <WaitlistPageContent />
    </Suspense>
  )
}

async function WaitlistPageContent() {
  const initialData = await listWaitlist()
  return <WaitlistView initialData={initialData} />
}
