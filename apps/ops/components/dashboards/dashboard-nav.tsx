"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { DashboardTabs, type DashboardTab } from "@workspace/ui/components/dashboard/dashboard-tabs"
import { DashboardToolbar } from "@workspace/ui/components/dashboard/dashboard-toolbar"

/**
 * Tabs and date range for an ops dashboard. State lives in the URL (`?tab=&range=`) and the page
 * is a server component, so each change navigates and the server loads only what the open tab
 * needs. Ops queries take the presets only, so there is no custom range here.
 */
export function DashboardNav({
  tabs,
  tab,
  range,
  showRange = true,
}: {
  tabs?: DashboardTab[]
  tab?: string
  range: DateRangeKey
  showRange?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function go(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }))
  }

  const hasTabs = Boolean(tabs && tab)
  if (!hasTabs && !showRange) return null

  // One row: tabs on the left, range on the right.
  return (
    <div aria-busy={pending}>
      <DashboardToolbar
        view={hasTabs ? <DashboardTabs tabs={tabs!} value={tab!} onChange={(value) => go({ tab: value })} /> : undefined}
        allowCustom={false}
        hideRange={!showRange}
        range={{ range }}
        onRangeChange={(next) => go({ range: next.range ?? null })}
      />
    </div>
  )
}
