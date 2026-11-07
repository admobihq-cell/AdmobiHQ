import { Suspense } from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { OverviewView } from "@/components/overview/overview-view"

export const metadata = { title: "Overview" }

export default function OverviewPage() {
  return (
    // The view reads ?range= with useSearchParams, which needs a boundary here.
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <OverviewView />
    </Suspense>
  )
}
