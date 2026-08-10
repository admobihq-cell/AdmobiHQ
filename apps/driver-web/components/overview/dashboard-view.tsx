import Link from "next/link"
import { Clock, HelpCircle, Package, Route as RouteIcon, TrendingUp, Wallet } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"

import { Greeting } from "@/components/overview/greeting"
import { StatCard } from "@/components/stat-card"
import { EARNINGS_STATS, RECENT_ACTIVITY } from "@/lib/placeholder-data"

const STAT_ICONS = [Wallet, Clock, TrendingUp, RouteIcon] as const

export function DashboardView({ deliveriesEnabled }: { deliveriesEnabled: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          <Greeting />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your day at a glance</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Placeholder dashboard — earnings, routes, and payouts will connect to live
          telemetry here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {EARNINGS_STATS.map((stat, index) => (
          <StatCard
            key={stat.label}
            icon={STAT_ICONS[index]!}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
          />
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 gap-2" asChild>
            <Link href="/earnings">
              <Wallet className="size-4" />
              View earnings
            </Link>
          </Button>
          <Button variant="outline" className="h-11 gap-2" asChild>
            <Link href="/routes">
              <RouteIcon className="size-4" />
              Route history
            </Link>
          </Button>
          {deliveriesEnabled ? (
            <Button variant="outline" className="h-11 gap-2" asChild>
              <Link href="/deliveries">
                <Package className="size-4" />
                Deliveries
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" className="h-11 gap-2" asChild>
            <Link href="/settings/support">
              <HelpCircle className="size-4" />
              Get help
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent activity
        </p>
        <Card className="shadow-none">
          <CardContent className="p-0">
            {RECENT_ACTIVITY.map((item, index) => (
              <div key={item.id}>
                {index > 0 ? <Separator /> : null}
                <div className="flex items-start gap-4 p-4">
                  <span
                    className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-muted-foreground">
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
