import { Suspense } from "react"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { SupportSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { DashboardNav } from "@/components/dashboards/dashboard-nav"
import { SupportDashboard } from "@/components/dashboards/support-dashboard"
import { dashboardParams, openDashboard } from "@/lib/dashboard-access"
import { getSupport } from "@/lib/queries/support-analytics"

export const metadata = { title: "Support & safety dashboard" }

async function Content({ range, includeSafety }: { range: DateRangeKey; includeSafety: boolean }) {
  try {
    return <SupportDashboard data={await getSupport(range, includeSafety)} />
  } catch (error: unknown) {
    return <ApiErrorBanner message={error instanceof Error ? error.message : "Could not load the support dashboard."} />
  }
}

export default async function SupportDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { has } = await openDashboard("support")
  const { range } = dashboardParams(await searchParams, [{ value: "main" }])
  // Incident data is safety-sensitive: it loads only for someone who also holds `safety`.
  const includeSafety = has("safety")

  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="support" />
      <DashboardNav range={range} />
      <Suspense key={range} fallback={<SupportSkeleton safety={includeSafety} />}>
        <Content range={range} includeSafety={includeSafety} />
      </Suspense>
    </div>
  )
}
