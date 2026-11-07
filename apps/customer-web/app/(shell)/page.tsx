import { Suspense } from "react"

import { OverviewPageSkeleton } from "@/components/skeletons/dashboard-skeletons"
import { OverviewView } from "@/components/overview/overview-view"

export const metadata = { title: "Overview" }

export default function OverviewPage() {
  return (
    // The view reads ?range= with useSearchParams, which needs a boundary here.
    <Suspense fallback={<OverviewPageSkeleton />}>
      <OverviewView />
    </Suspense>
  )
}
