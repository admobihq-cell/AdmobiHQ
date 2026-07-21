import Link from "next/link"
import {
  ArrowRight,
  Car,
  FileText,
  Layers,
  Mail,
  Megaphone,
  Truck,
} from "lucide-react"

import { SectionHeading } from "@/components/ui/section-heading"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type OpsHomeStatsProps = {
  stats: {
    leads: number
    fleet: number
    drivers: number
    waitlist: number
    mediaKit: number
    total: number
  } | null
}

const STAT_CONFIG = [
  { key: "total", label: "Total submissions", icon: Layers },
  { key: "leads", label: "Campaign leads", icon: Megaphone },
  { key: "fleet", label: "Fleet partners", icon: Truck },
  { key: "drivers", label: "Drivers", icon: Car },
  { key: "waitlist", label: "Waitlist", icon: Mail },
  { key: "mediaKit", label: "Media kit", icon: FileText },
] as const

export function OpsHomeStats({ stats }: OpsHomeStatsProps) {
  if (!stats) {
    return (
      <Card className="border-dashed shadow-none">
        <CardHeader>
          <CardTitle>Stats unavailable</CardTitle>
          <CardDescription>
            Could not load the 30-day snapshot. Check database connectivity or
            run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              npm run env:pull -w ops
            </code>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Last 30 days"
        description="Quick snapshot across all submission types."
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/overview">
              Full overview
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STAT_CONFIG.map((item) => (
          <StatCard
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={stats[item.key]}
            hint={item.key === "total" ? "All types" : undefined}
          />
        ))}
      </div>
    </section>
  )
}
