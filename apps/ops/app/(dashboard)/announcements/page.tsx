import { Suspense } from "react"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { AnnouncementsView } from "./announcements-view"
import { ANNOUNCEMENTS_PAGE } from "@/lib/entity-pages"
import { listAnnouncementBroadcasts } from "@/lib/queries/entities"

export default function AnnouncementsPage() {
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
