import { Suspense } from "react"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { DeliverySkeleton, InventorySkeleton, PipelineSkeleton } from "@/components/dashboards/dashboard-skeletons"
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

function TabSkeleton({ tab }: { tab: string }) {
  if (tab === "delivery") return <DeliverySkeleton />
  if (tab === "inventory") return <InventorySkeleton />
  return <PipelineSkeleton />
}

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
      <DashboardHeader page="campaigns" />
      <DashboardNav tabs={TABS} tab={tab} range={range} />
      <Suspense key={`${tab}-${range}`} fallback={<TabSkeleton tab={tab} />}>
        <Tab tab={tab} range={range} includeMoney={includeMoney} />
      </Suspense>
    </div>
  )
}
