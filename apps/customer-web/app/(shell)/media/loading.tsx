import { Skeleton } from "@workspace/ui/components/skeleton"

import { MediaGridSkeleton } from "@/components/media/media-skeletons"

export default function MediaLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Media Manager</h1>
        <Skeleton className="mt-1 h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg md:max-w-lg" />
      <h2 className="text-lg font-medium">All files</h2>
      <MediaGridSkeleton columns="sm:grid-cols-2 xl:grid-cols-4" />
    </div>
  )
}
