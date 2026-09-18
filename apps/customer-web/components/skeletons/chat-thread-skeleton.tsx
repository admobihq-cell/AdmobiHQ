import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches a support case thread — subject header, message bubbles, and the
 * composer attached to the bottom of the same card. */
export function ChatThreadSkeleton() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-16 rounded-4xl" />
        </div>
        <Skeleton className="h-3 w-48" />
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="space-y-4 p-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={i % 2 === 0 ? "flex flex-row-reverse gap-2" : "flex gap-2"}
            >
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton
                className={
                  i % 2 === 0 ? "h-12 w-2/3 rounded-2xl rounded-br-sm" : "h-16 w-3/4 rounded-2xl rounded-bl-sm"
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t p-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="ml-auto h-9 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
