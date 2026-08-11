import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { AnnouncementsView } from "./announcements-view"
import { ANNOUNCEMENTS_PAGE } from "@/lib/entity-pages"
import { listAnnouncementBroadcasts } from "@/lib/queries/entities"
import { requireOpsPermission } from "@/lib/auth"

export default async function AnnouncementsPage() {
  try {
    await requireOpsPermission("announcements")
  } catch {
    redirect("/home")
  }

  return (
    <Suspense fallback={<EntityPageChrome {...ANNOUNCEMENTS_PAGE} loading />}>
      <AnnouncementsPageContent />
    </Suspense>
  )
}

async function AnnouncementsPageContent() {
  const initialData = await listAnnouncementBroadcasts()
  return <AnnouncementsView initialData={initialData} />
}
