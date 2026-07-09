import Link from "next/link"

import { OverviewDashboardSkeleton } from "@/components/overview-dashboard-skeleton"
import { OverviewRangePicker } from "@/components/overview-range-picker"
import { Button } from "@workspace/ui/components/button"

const QUICK_LINKS = [
  { href: "/leads", label: "Campaign Leads" },
  { href: "/fleet", label: "Fleet Partners" },
  { href: "/drivers", label: "Drivers" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/media-kit", label: "Media Kit" },
] as const

export default function OverviewLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Operational pulse across leads, fleet, drivers, and signups.
          </p>
        </div>
        <OverviewRangePicker range="30d" />
      </div>

      <OverviewDashboardSkeleton />

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
