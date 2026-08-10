import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches campaign detail's 2-col layout — progress card + divided field-record card. */
export function DetailRecordSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Card className="shadow-none">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Card className="shadow-none">
          <CardContent className="p-0">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i}>
                {i > 0 ? <Separator /> : null}
                <div className="flex items-center justify-between gap-3 p-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
