import { Suspense } from "react"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { AdvertisersDashboard } from "@/components/dashboards/advertisers-dashboard"
import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { AdvertisersSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { DashboardNav } from "@/components/dashboards/dashboard-nav"
import { dashboardParams, openDashboard } from "@/lib/dashboard-access"
import { getAdvertisers } from "@/lib/queries/advertiser-analytics"

export const metadata = { title: "Advertisers dashboard" }

async function Content({ range, includeMoney }: { range: DateRangeKey; includeMoney: boolean }) {
  try {
    return <AdvertisersDashboard data={await getAdvertisers(range, includeMoney)} />
  } catch (error: unknown) {
    return <ApiErrorBanner message={error instanceof Error ? error.message : "Could not load the advertisers dashboard."} />
  }
}

export default async function AdvertisersDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  // Same guard as /advertiser-orgs.
  const { has } = await openDashboard("campaigns")
  const { range } = dashboardParams(await searchParams, [{ value: "main" }])
  // Spend, balances and revenue share are money: they load only for someone who could open Finances.
  const includeMoney = has("finances")

  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="advertisers" />
      <DashboardNav range={range} />
      <Suspense key={range} fallback={<AdvertisersSkeleton money={includeMoney} />}>
        <Content range={range} includeMoney={includeMoney} />
      </Suspense>
    </div>
  )
}
