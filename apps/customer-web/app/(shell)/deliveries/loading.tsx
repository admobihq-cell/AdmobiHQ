import { Skeleton } from "@workspace/ui/components/skeleton"

import { FormCardSkeleton } from "@/components/skeletons/form-card-skeleton"

/** Deliveries is a static preview with no real async data — kept deliberately light. */
export default function DeliveriesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="w-full max-w-xl">
        <FormCardSkeleton fields={2} columns={1} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  )
}
