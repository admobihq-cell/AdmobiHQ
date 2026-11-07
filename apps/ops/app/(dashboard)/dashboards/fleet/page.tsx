import { Suspense } from "react"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Skeleton } from "@workspace/ui/components/skeleton"
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
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Dashboards</p>
        <h1 className="text-3xl font-semibold tracking-tight">Fleet</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Drivers, applications waiting for a decision, and how many vehicles are on the road.
        </p>
      </div>
      <DashboardNav range={range} />
      <Suspense key={range} fallback={<Skeleton className="h-96 w-full" />}>
        <Content range={range} includeMoney={includeMoney} />
      </Suspense>
    </div>
  )
}
