import { Skeleton } from "@workspace/ui/components/skeleton"

export default function MediaLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg md:max-w-lg" />
      <Skeleton className="h-7 w-28" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
