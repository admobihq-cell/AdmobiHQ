import { Skeleton } from "@workspace/ui/components/skeleton"

export default function BillingLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-8 w-full max-w-sm" />
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}
