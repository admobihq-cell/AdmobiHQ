import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches a support case thread — header, alternating message bubbles, reply box. */
export function ChatThreadSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl rounded-br-sm" />
        <Skeleton className="h-10 w-3/4 rounded-2xl rounded-bl-sm" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl rounded-br-sm" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="ml-auto h-9 w-32 rounded-lg" />
      </div>
    </div>
  )
}
