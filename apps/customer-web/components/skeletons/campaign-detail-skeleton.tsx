import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { StatCardGridSkeleton } from "@/components/skeletons/stat-card-grid-skeleton"

/** Mirrors `CampaignDetailView` exactly — back link, title + badge, three stat
 * cards, the five-row record card, then the creative section. Shared by the
 * route's `loading.tsx` and the view's own pending branch so the page doesn't
 * show two different skeletons in a row while react-query fetches. */
export function CampaignDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Skeleton className="h-9 w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      </div>

      <StatCardGridSkeleton count={3} className="sm:grid-cols-3 xl:grid-cols-3" />

      <Card className="shadow-none">
        <CardContent className="p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0"
            >
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}
