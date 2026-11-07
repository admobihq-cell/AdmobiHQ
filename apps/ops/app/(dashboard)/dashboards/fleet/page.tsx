import { Suspense } from "react"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { FleetSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { DashboardNav } from "@/components/dashboards/dashboard-nav"
import { FleetDashboard } from "@/components/dashboards/fleet-dashboard"
import { dashboardParams, openDashboard } from "@/lib/dashboard-access"
import { getFleet } from "@/lib/queries/fleet-analytics"

export const metadata = { title: "Fleet dashboard" }

async function Content({ range, includeMoney }: { range: DateRangeKey; includeMoney: boolean }) {
  try {
    return <FleetDashboard data={await getFleet(range, includeMoney)} />
  } catch (error: unknown) {
    return <ApiErrorBanner message={error instanceof Error ? error.message : "Could not load the fleet dashboard."} />
  }
}

export default async function FleetDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { has } = await openDashboard("drivers")
  const { range } = dashboardParams(await searchParams, [{ value: "main" }])
  // Payouts are money: they load only for someone who could open Finances.
  const includeMoney = has("finances")

  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="fleet" />
      <DashboardNav range={range} />
      <Suspense key={range} fallback={<FleetSkeleton money={includeMoney} />}>
        <Content range={range} includeMoney={includeMoney} />
      </Suspense>
    </div>
  )
}
