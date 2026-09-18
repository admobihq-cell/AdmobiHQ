import { Skeleton } from "@workspace/ui/components/skeleton"

import { CaseListSkeleton } from "@/components/skeletons/case-list-skeleton"

export default function SupportListLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <CaseListSkeleton rows={3} />
    </div>
  )
}
