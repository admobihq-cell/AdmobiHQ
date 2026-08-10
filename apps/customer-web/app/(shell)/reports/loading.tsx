import { Skeleton } from "@workspace/ui/components/skeleton"

/** Reports is a static "coming soon" stub — a light placeholder is enough, no data to skeletonize. */
export default function ReportsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border bg-muted/20 p-12 text-center">
      <Skeleton className="mx-auto h-3 w-20" />
      <Skeleton className="mx-auto h-6 w-40" />
    </div>
  )
}
