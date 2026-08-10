import { Clock, Route as RouteIcon, TrendingUp, Wallet } from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { StatCard } from "@/components/stat-card"
import { DAILY_EARNINGS, EARNINGS_STATS } from "@/lib/placeholder-data"

const STAT_ICONS = [Wallet, Clock, TrendingUp, RouteIcon] as const

export function EarningsView() {
  const maxAmount = Math.max(...DAILY_EARNINGS.map((d) => d.amount))

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          This week
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your earnings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Illustrative numbers — real earnings connect once proof-of-play telemetry
          from your screen goes live.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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
          Daily breakdown
        </p>
        <Card className="shadow-none">
          <CardContent className="p-6">
            <div className="flex items-end justify-between gap-3">
              {DAILY_EARNINGS.map((entry) => (
                <div key={entry.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t-md bg-primary/80"
                      style={{ height: `${(entry.amount / maxAmount) * 100}%` }}
                      aria-hidden
                    />
                  </div>
                  <p className="text-xs font-medium">{entry.day}</p>
                  <p className="text-[11px] text-muted-foreground">{entry.hours}h</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Payout history
        </p>
        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="flex items-start gap-4 p-4">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium">No payouts yet</p>
                <p className="text-xs text-muted-foreground">
                  Payout history will appear here once telemetry and payouts are live —
                  in the meantime, ops settles earnings manually.
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-4 p-4">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium">Sample entry — illustrative</p>
                <p className="text-xs text-muted-foreground">
                  KES 8,400 · Weekly settlement · Pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
