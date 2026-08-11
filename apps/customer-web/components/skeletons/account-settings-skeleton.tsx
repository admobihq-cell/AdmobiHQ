import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches account-settings-view.tsx — profile card, sign-in methods list, active sessions list. */
export function AccountSettingsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <Card className="shadow-none">
        <CardContent className="flex items-start justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Card className="overflow-hidden p-0 shadow-none">
          <CardContent className="p-0">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                {i > 0 ? <Separator /> : null}
                <div className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Card className="overflow-hidden p-0 shadow-none">
          <CardContent className="p-0">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                {i > 0 ? <Separator /> : null}
                <div className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
    </div>
  )
}
