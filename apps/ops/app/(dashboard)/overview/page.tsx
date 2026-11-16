import Link from "next/link"
import { Suspense } from "react"
import {
  Car,
  FileText,
  Mail,
  Megaphone,
  Truck,
} from "lucide-react"

import { DASHBOARD_COPY } from "@/components/dashboards/dashboard-header"
import { OverviewSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { DashboardNav } from "@/components/dashboards/dashboard-nav"
import { OverviewStats } from "@/components/overview/overview-stats"
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
        eyebrow="Dashboards"
        title={DASHBOARD_COPY.overview.title}
        description={DASHBOARD_COPY.overview.description}
      />
      <DashboardNav range={range} />

      <Suspense fallback={<OverviewSkeleton />} key={range}>
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
