import Link from "next/link"
import { Suspense } from "react"

import { OverviewDashboardSkeleton } from "@/components/overview-dashboard-skeleton"
import { OverviewRangePicker } from "@/components/overview-range-picker"
import { OverviewStats } from "@/components/overview-stats"
import { Button } from "@workspace/ui/components/button"
import type { DateRangeKey } from "@/lib/queries/stats"

const QUICK_LINKS = [
  { href: "/leads", label: "Campaign Leads" },
  { href: "/fleet", label: "Fleet Partners" },
  { href: "/drivers", label: "Drivers" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/media-kit", label: "Media Kit" },
] as const

function parseRange(value: string | undefined): DateRangeKey {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") {
    return value
  }
  return "30d"
}

type OverviewPageProps = {
  searchParams: Promise<{ range?: string }>
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const { range: rawRange } = await searchParams
  const range = parseRange(rawRange)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Operational pulse across leads, fleet, drivers, and signups.
          </p>
        </div>
        <OverviewRangePicker range={range} />
      </div>

      <Suspense fallback={<OverviewDashboardSkeleton />} key={range}>
        <OverviewStats range={range} />
      </Suspense>

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => (
          <Button key={link.href} variant="outline" size="sm" asChild>
            <Link href={link.href}>{link.label} →</Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
