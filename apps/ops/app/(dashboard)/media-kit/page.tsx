import { Suspense } from "react"
import { redirect } from "next/navigation"

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { MediaKitView } from "./media-kit-view"
import { MEDIA_KIT_PAGE } from "@/lib/entity-pages"
import { listMediaKitRequests } from "@/lib/queries/entities"
import { requireOpsPermission } from "@/lib/auth"

export default async function MediaKitPage() {
  try {
    await requireOpsPermission("media_kit")
  } catch {
    redirect("/home")
  }

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
