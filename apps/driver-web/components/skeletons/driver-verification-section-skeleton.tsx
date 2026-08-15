import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches driver-verification-section.tsx — status icon + heading +
 * description, CTA button, and the submitted-info accordion trigger. */
export function DriverVerificationSectionSkeleton() {
  return (
    <div className="space-y-3">
      <Card className="shadow-none">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="space-y-2 pt-0.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3.5 w-64 max-w-[70vw]" />
              </div>
            </div>
            <Skeleton className="h-8 w-36 shrink-0 rounded-lg" />
          </div>

          <div className="border-t pt-4">
            <Skeleton className="h-4 w-52" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
