import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Route-level `loading.tsx` placeholder for a MapCanvas page. Mirrors the
 * full-bleed frame + floating rail shape so the real layout (and the Map
 * component's own loader) hands off with no jump.
 */
export function MapCanvasSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative -m-4 h-[calc(100vh-3rem-2rem)] overflow-hidden md:-m-6 md:h-[calc(100vh-3rem-3rem)] md:rounded-b-xl",
        className,
      )}
    >
      <Skeleton className="absolute inset-0 rounded-none md:rounded-b-xl" />
      <div className="absolute inset-y-3 left-3 w-80 max-w-[calc(100%-1.5rem)] space-y-3 rounded-xl border bg-background p-4 shadow-sm">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}
