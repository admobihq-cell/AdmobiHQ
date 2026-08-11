import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches SettingsToggleRow — icon, label + description, trailing checkbox. */
export function ToggleListSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <Card className="overflow-hidden p-0 shadow-none">
        <CardContent className="p-0">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i}>
              {i > 0 ? <Separator /> : null}
              <div className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-56" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="size-4 shrink-0 rounded-sm" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Skeleton className="h-3 w-full max-w-xs" />
    </div>
  )
}
