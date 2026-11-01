import { Suspense } from "react"

import { MediaLibraryView } from "@/components/media/media-library-view"

import MediaLoading from "./loading"

export const metadata = { title: "Media" }

export default function MediaPage() {
  return (
    // The view reads ?view= with useSearchParams, which needs a boundary here.
    <Suspense fallback={<MediaLoading />}>
      <MediaLibraryView />
    </Suspense>
  )
}
