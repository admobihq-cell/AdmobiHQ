import { Suspense } from "react"
import { redirect } from "next/navigation"
import { DATE_RANGE_KEYS, type DateRangeKey } from "@workspace/ops-contracts"

import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { FinanceSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { DashboardNav } from "@/components/dashboards/dashboard-nav"
import { FINANCE_TABS, FinanceTab } from "@/components/finances/finance-view"
import { requireOpsPermission } from "@/lib/auth"

export const metadata = { title: "Finances" }

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; range?: string }>
}) {
  try {
    await requireOpsPermission("finances")
  } catch {
    redirect("/home")
  }

  const params = await searchParams
  const tab = FINANCE_TABS.some((t) => t.value === params.tab) ? params.tab! : "overview"
  const range = (DATE_RANGE_KEYS as readonly string[]).includes(params.range ?? "")
    ? (params.range as DateRangeKey)
    : "30d"

  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="finances" />
      <DashboardNav tabs={FINANCE_TABS} tab={tab} range={range} showRange={tab !== "wallets" && tab !== "tools"} />
      {/* Keyed on tab and range so a change shows the skeleton instead of the old tab. */}
      <Suspense key={`${tab}-${range}`} fallback={<FinanceSkeleton tab={tab} />}>
        <FinanceTab tab={tab} range={range} />
      </Suspense>
    </div>
  )
}
