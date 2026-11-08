"use client"

import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { PayoutStatCards } from "@/components/overview/payout-stat-cards"
import {
  formatKes,
  formatPayoutDate,
  monthName,
  PAYOUT_STATUS_LABEL,
  useDriverPayouts,
} from "@/lib/use-driver-payouts"

/**
 * Real payouts only. Screen-on hours, distance and per-day earnings are not
 * shown: nothing records them yet, and an invented number is worse than none.
 */
export function EarningsView() {
  const { data, error } = useDriverPayouts()

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Payouts</p>
        <h1 className="text-3xl font-semibold tracking-tight">Your earnings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          What Admobi has paid you and what&apos;s on its way, sent to the M-Pesa number or bank account in your
          profile.
        </p>
      </div>

      <PayoutStatCards />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payout history</p>
        <Card className="shadow-none">
          <CardContent className="p-0">
            {error ? (
              <p className="p-4 text-sm text-muted-foreground">Couldn&apos;t load your payouts. Try again later.</p>
            ) : !data ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : data.items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No payouts yet. They appear here once ops sends one.</p>
            ) : (
              data.items.map((p, index) => (
                <div key={p.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-start gap-4 p-4">
                    <span
                      className={`mt-1.5 size-2.5 shrink-0 rounded-full ${p.status === "settled" ? "bg-primary" : "bg-muted-foreground/40"}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium">{monthName(p.periodMonth)}</p>
                      <p className="text-xs text-muted-foreground">
                        {PAYOUT_STATUS_LABEL[p.status] ?? p.status}
                        {p.paidAt ? ` · ${formatPayoutDate(p.paidAt)}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">{formatKes(p.amountKes)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
