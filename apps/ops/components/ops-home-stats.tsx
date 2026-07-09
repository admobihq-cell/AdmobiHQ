import Link from "next/link"
import { ArrowRight } from "lucide-react"

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

export function OpsHomeStats({ stats }: OpsHomeStatsProps) {
  const statItems = stats
    ? [
        { label: "Total (30d)", value: stats.total },
        { label: "Campaign leads", value: stats.leads },
        { label: "Fleet partners", value: stats.fleet },
        { label: "Drivers", value: stats.drivers },
        { label: "Waitlist", value: stats.waitlist },
        { label: "Media kit", value: stats.mediaKit },
      ]
    : null

  if (!statItems) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Stats unavailable</CardTitle>
          <CardDescription>
            Could not load the 30-day snapshot. Check database connectivity or run{" "}
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Last 30 days</h2>
          <p className="text-sm text-muted-foreground">
            Quick snapshot across all submission types.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/overview">
            Full overview
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statItems.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
