import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

type FormCardSkeletonProps = {
  fields?: number
  columns?: 1 | 2
}

/** Matches settings form cards — a section label, labeled input rows, a save button. */
export function FormCardSkeleton({
  fields = 4,
  columns = 2,
}: FormCardSkeletonProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-6 p-6">
        <Skeleton className="h-4 w-32" />
        <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </CardContent>
    </Card>
  )
}
