import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { WaitlistView } from "./waitlist-view"
import { WAITLIST_PAGE } from "@/lib/entity-pages"
import { listWaitlist } from "@/lib/queries/entities"
import { requireOpsPermission } from "@/lib/auth"

export default async function WaitlistPage() {
  try {
    await requireOpsPermission("waitlist")
  } catch {
    redirect("/home")
  }

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
