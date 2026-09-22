import { Skeleton } from "@workspace/ui/components/skeleton"

/** Mirrors the map+rail split so the real layout (and the Map component's own loader) hands off with no jump. */
export default function RoutesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid flex-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-[min(60vh,560px)] min-h-[420px] rounded-xl lg:h-auto" />
        <Skeleton className="min-h-[420px] rounded-xl lg:h-auto" />
      </div>
    </div>
  )
}
