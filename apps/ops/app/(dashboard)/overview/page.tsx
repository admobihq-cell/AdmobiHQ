import Link from "next/link"
import { Suspense } from "react"
import {
  Car,
  FileText,
  Mail,
  Megaphone,
  Truck,
} from "lucide-react"

import { OverviewDashboardSkeleton } from "@/components/overview-dashboard-skeleton"
import { OverviewRangePicker } from "@/components/overview-range-picker"
import { OverviewStats } from "@/components/overview-stats"
import { PageHero } from "@/components/ui/page-hero"
import { SectionHeading } from "@/components/ui/section-heading"
import { Button } from "@workspace/ui/components/button"
import type { DateRangeKey } from "@/lib/queries/stats"

const QUICK_LINKS = [
  { href: "/leads", label: "Campaign Leads", icon: Megaphone },
  { href: "/fleet", label: "Fleet Partners", icon: Truck },
  { href: "/drivers", label: "Drivers", icon: Car },
  { href: "/waitlist", label: "Waitlist", icon: Mail },
  { href: "/media-kit", label: "Media Kit", icon: FileText },
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
    <div className="flex flex-1 flex-col gap-8">
      <PageHero
        eyebrow="Analytics"
        title="Operational overview"
        description="Operational pulse across leads, fleet, drivers, and signups."
        actions={<OverviewRangePicker range={range} />}
      />

      <Suspense fallback={<OverviewDashboardSkeleton />} key={range}>
        <OverviewStats range={range} />
      </Suspense>

      <div className="space-y-3">
        <SectionHeading title="Quick links" />
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Button
              key={link.href}
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              asChild
            >
              <Link href={link.href}>
                <link.icon className="size-3.5" />
                {link.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
