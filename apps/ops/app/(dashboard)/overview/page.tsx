import { Suspense } from "react"

import { OverviewSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { OverviewModules } from "@/components/overview/overview-modules"
import { OverviewStats } from "@/components/overview/overview-stats"
import { OverviewWelcome, WelcomeSkeleton } from "@/components/overview/overview-welcome"
import type { DateRangeKey } from "@/lib/queries/stats"

function parseRange(value: string | undefined): DateRangeKey {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") {
    return value
  }
  return "30d"
}

type OverviewPageProps = {
  searchParams: Promise<{ range?: string }>
}

/**
 * The console's landing page. No permission guard on purpose: every other page redirects here when
 * the viewer lacks access, so it must always render. Each section is cut to the viewer's permissions
 * instead (see OverviewStats and OverviewModules).
 */
export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const { range: rawRange } = await searchParams
  const range = parseRange(rawRange)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Suspense fallback={<WelcomeSkeleton />}>
        <OverviewWelcome range={range} />
      </Suspense>

      <Suspense fallback={<OverviewSkeleton />} key={range}>
        <OverviewStats range={range} />
      </Suspense>

      <Suspense fallback={null}>
        <OverviewModules />
      </Suspense>
    </div>
  )
}
