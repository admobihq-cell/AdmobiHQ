import { Skeleton } from "@workspace/ui/components/skeleton"

import { FormCardSkeleton } from "@/components/skeletons/form-card-skeleton"

/** Shared across account, security, and notifications — all three are the same form-card shape. */
export default function PrefsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <FormCardSkeleton fields={4} columns={2} />
      <FormCardSkeleton fields={2} columns={1} />
    </div>
  )
}
