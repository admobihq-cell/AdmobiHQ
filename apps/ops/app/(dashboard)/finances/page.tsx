import { Suspense } from "react"
import { redirect } from "next/navigation"
import { DATE_RANGE_KEYS, type DateRangeKey } from "@workspace/ops-contracts"

import { Skeleton } from "@workspace/ui/components/skeleton"
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
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Dashboards</p>
        <h1 className="text-3xl font-semibold tracking-tight">Finances</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Money in and out of advertiser wallets, driver payouts and what the platform costs to run.
        </p>
      </div>
      <DashboardNav tabs={FINANCE_TABS} tab={tab} range={range} showRange={tab !== "wallets" && tab !== "tools"} />
      {/* Keyed on tab and range so a change shows the skeleton instead of the old tab. */}
      <Suspense key={`${tab}-${range}`} fallback={<Skeleton className="h-96 w-full" />}>
        <FinanceTab tab={tab} range={range} />
      </Suspense>
    </div>
  )
}
