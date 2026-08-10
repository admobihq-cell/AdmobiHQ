import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches the route-breakdown cards — name/corridor/hours lines + earnings footer. */
export function RouteCardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="shadow-none">
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-14" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
