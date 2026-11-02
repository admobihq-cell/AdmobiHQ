import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

const CARD_COUNT = 8
/** Each card's scan starts a beat after the last, so the signal travels. */
const SCAN_STEP_MS = 140
/** File names differ in length, so the placeholders do too. */
const NAME_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-3/5", "w-4/5", "w-1/2", "w-2/3", "w-3/4"]

/** A dark LED roof panel warming up: a dot matrix with a band of lit pixels
 * scanning across it. Styled by .led-skeleton in the shared globals. */
export function LedPanel({ className, delayMs = 0 }: { className?: string; delayMs?: number }) {
  return (
    <div
      aria-hidden
      className={cn("led-skeleton rounded-md", className)}
      style={{ "--scan-delay": `${delayMs}ms` } as React.CSSProperties}
    />
  )
}

function FileCardSkeleton({ index }: { index: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex h-40 flex-col gap-2 rounded-lg bg-muted/50 p-3">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <LedPanel className="aspect-3/1 w-full" delayMs={index * SCAN_STEP_MS} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      </CardContent>
      <CardHeader>
        <Skeleton className={cn("h-4", NAME_WIDTHS[index % NAME_WIDTHS.length])} />
        <Skeleton className="h-3.5 w-1/2" />
      </CardHeader>
    </Card>
  )
}

export function MediaGridSkeleton({ columns }: { columns: string }) {
  return (
    <div role="status" aria-label="Loading files" className={cn("grid gap-4", columns)}>
      {Array.from({ length: CARD_COUNT }).map((_, index) => (
        <FileCardSkeleton key={index} index={index} />
      ))}
    </div>
  )
}

export function MediaListSkeleton() {
  return (
    <div role="status" aria-label="Loading files" className="divide-y divide-border">
      {Array.from({ length: CARD_COUNT }).map((_, index) => (
        <div key={index} className="flex h-11 items-center gap-3">
          <LedPanel className="h-5 w-5 shrink-0" delayMs={index * SCAN_STEP_MS} />
          <Skeleton className={cn("h-3.5 max-w-72", NAME_WIDTHS[index % NAME_WIDTHS.length])} />
          <Skeleton className="ml-auto hidden h-3.5 w-20 md:block" />
          <Skeleton className="hidden h-3.5 w-14 sm:block" />
        </div>
      ))}
    </div>
  )
}
