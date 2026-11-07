import { Suspense } from "react"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { DashboardNav } from "@/components/dashboards/dashboard-nav"
import { DeliveryTab, InventoryTab, PipelineTab } from "@/components/dashboards/campaigns-dashboard"
import { dashboardParams, openDashboard } from "@/lib/dashboard-access"
import { getDelivery, getInventory, getPipeline } from "@/lib/queries/campaign-analytics"
import type { DateRangeKey } from "@workspace/ops-contracts"

export const metadata = { title: "Campaigns dashboard" }

const TABS = [
  { value: "pipeline", label: "Pipeline" },
  { value: "delivery", label: "Delivery" },
  { value: "inventory", label: "Inventory mix" },
]

async function Tab({ tab, range, includeMoney }: { tab: string; range: DateRangeKey; includeMoney: boolean }) {
  try {
    if (tab === "delivery") return <DeliveryTab data={await getDelivery(range)} />
    if (tab === "inventory") return <InventoryTab data={await getInventory(range, includeMoney)} />
    return <PipelineTab data={await getPipeline(range, includeMoney)} />
  } catch (error: unknown) {
    return <ApiErrorBanner message={error instanceof Error ? error.message : "Could not load the campaigns dashboard."} />
  }
}

export default async function CampaignsDashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string; range?: string }> }) {
  const { has } = await openDashboard("campaigns")
  const { tab, range } = dashboardParams(await searchParams, TABS)
  // Budget is money: it loads only for someone who could open Finances.
  const includeMoney = has("finances")

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Dashboards</p>
        <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          What is waiting for review, how campaigns are delivering, and what the network has booked.
        </p>
      </div>
      <DashboardNav tabs={TABS} tab={tab} range={range} />
      <Suspense key={`${tab}-${range}`} fallback={<Skeleton className="h-96 w-full" />}>
        <Tab tab={tab} range={range} includeMoney={includeMoney} />
      </Suspense>
    </div>
  )
}
