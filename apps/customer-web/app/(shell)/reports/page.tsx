import { Suspense } from "react"

import { ReportsView } from "@/components/reports/reports-view"

import ReportsLoading from "./loading"

export const metadata = { title: "Reports" }

export default function ReportsPage() {
  return (
    // The view reads ?tab=, ?range= and the filters with useSearchParams, which needs a boundary here.
    <Suspense fallback={<ReportsLoading />}>
      <ReportsView />
    </Suspense>
  )
}
