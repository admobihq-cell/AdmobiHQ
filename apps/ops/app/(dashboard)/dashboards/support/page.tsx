import { Suspense } from "react"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Skeleton } from "@workspace/ui/components/skeleton"
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
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Dashboards</p>
        <h1 className="text-3xl font-semibold tracking-tight">Support &amp; safety</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          What people are asking for help with, what has been waiting longest, and open driver safety reports.
        </p>
      </div>
      <DashboardNav range={range} />
      <Suspense key={range} fallback={<Skeleton className="h-96 w-full" />}>
        <Content range={range} includeSafety={includeSafety} />
      </Suspense>
    </div>
  )
}
