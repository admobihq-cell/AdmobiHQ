import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { RouteCardGridSkeleton } from "@/components/skeletons/route-card-grid-skeleton"

/** Mirrors the map container's exact box so the Map component's own loader hands off with no jump. */
export default function RoutesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      <Card className="shadow-none">
        <CardContent className="grid grid-cols-3 divide-x p-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5 px-4 py-3 text-center">
              <Skeleton className="mx-auto h-4 w-10" />
              <Skeleton className="mx-auto h-3 w-14" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Skeleton className="h-[min(55vh,520px)] min-h-[380px] flex-1 rounded-xl" />

      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <RouteCardGridSkeleton count={3} />
      </div>
    </div>
  )
}
