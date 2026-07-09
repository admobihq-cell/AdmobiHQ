import { Suspense } from "react"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { MediaKitView } from "./media-kit-view"
import { MEDIA_KIT_PAGE } from "@/lib/entity-pages"
import { listMediaKitRequests } from "@/lib/queries/entities"

export default function MediaKitPage() {
  return (
    <Suspense fallback={<EntityPageChrome {...MEDIA_KIT_PAGE} loading />}>
      <MediaKitPageContent />
    </Suspense>
  )
}

async function MediaKitPageContent() {
  const initialData = await listMediaKitRequests()
  return <MediaKitView initialData={initialData} />
}
