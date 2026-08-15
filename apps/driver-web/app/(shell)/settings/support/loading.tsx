import { Skeleton } from "@workspace/ui/components/skeleton"

import { CaseListSkeleton } from "@/components/skeletons/case-list-skeleton"
import { NewRequestFormSkeleton } from "@/components/skeletons/new-request-form-skeleton"

export default function SupportListLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <NewRequestFormSkeleton />

        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <CaseListSkeleton rows={3} />
        </div>
      </div>
    </div>
  )
}
