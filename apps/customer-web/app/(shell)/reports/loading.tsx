import { Skeleton } from "@workspace/ui/components/skeleton"

export default function ReportsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-8 w-full max-w-sm" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full xl:col-span-2" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  )
}
