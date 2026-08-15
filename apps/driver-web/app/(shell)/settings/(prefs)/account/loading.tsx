import { Skeleton } from "@workspace/ui/components/skeleton"

import { DriverVerificationSectionSkeleton } from "@/components/skeletons/driver-verification-section-skeleton"

export default function AccountStatusLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <DriverVerificationSectionSkeleton />
    </div>
  )
}
