import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches support case rows — icon tile, subject/meta, trailing status badge. */
export function CaseListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            {i > 0 ? <Separator /> : null}
            <div className="flex items-center gap-3 p-4">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
