"use client"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { PayoutHero } from "@/components/overview/payout-hero"
import {
  formatKes,
  formatPayoutDate,
  monthName,
  PAYOUT_STATUS_LABEL,
  useDriverPayouts,
} from "@/lib/use-driver-payouts"

const TONE: Record<string, { node: string; badge: string }> = {
  settled: { node: "bg-primary border-primary", badge: "bg-primary/10 text-primary" },
  pending: { node: "bg-background border-primary", badge: "bg-muted text-foreground" },
  processing: { node: "bg-background border-primary", badge: "bg-muted text-foreground" },
  failed: { node: "bg-destructive border-destructive", badge: "bg-destructive/10 text-destructive" },
  reversed: { node: "bg-destructive border-destructive", badge: "bg-destructive/10 text-destructive" },
}
const UNKNOWN_TONE = { node: "bg-background border-border", badge: "bg-muted text-muted-foreground" }

/**
 * Real payouts only. Screen-on hours, distance and per-day earnings are not
 * shown: nothing records them yet, and an invented number is worse than none.
 */
export function EarningsView({ payoutDestination }: { payoutDestination: string | null }) {
  const { data, isError, isFetching, refetch } = useDriverPayouts()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Earnings</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          What Admobi has paid you and what&apos;s on its way.
        </p>
      </div>

      <PayoutHero destination={payoutDestination} />

      <section aria-labelledby="history-heading" className="space-y-4">
        <h2 id="history-heading" className="text-lg font-semibold tracking-tight">
          Payout history
        </h2>

        {isError && !data ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" aria-live="polite">
            <p className="text-sm text-muted-foreground">Your history didn&apos;t load.</p>
            <Button variant="outline" className="h-10" loading={isFetching} onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div className="space-y-5 pl-8" aria-busy="true" aria-label="Loading payout history">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            Nothing here yet. Each monthly payout is added the moment Admobi saves it.
          </p>
        ) : (
          <ol className="relative">
            {data.items.map((p, index) => {
              const tone = TONE[p.status] ?? UNKNOWN_TONE
              const isLast = index === data.items.length - 1
              return (
                <li
                  key={p.id}
                  className="animate-in fade-in fill-mode-both motion-reduce:animate-none relative grid grid-cols-[1.25rem_1fr_auto] gap-x-4 pb-6 duration-300 last:pb-0"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  {/* The route: a node per payout, joined by a line to the one before. */}
                  <span aria-hidden className="relative flex justify-center">
                    <span className={cn("relative z-10 mt-1 size-3 rounded-full border-2", tone.node)} />
                    {isLast ? null : <span className="absolute top-4 -bottom-6 w-0.5 bg-border" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{monthName(p.periodMonth)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("rounded-full px-2 py-0.5 font-medium", tone.badge)}>
                        {PAYOUT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      {p.paidAt ? formatPayoutDate(p.paidAt) : null}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-base font-semibold tabular-nums",
                      (p.status === "failed" || p.status === "reversed") && "text-muted-foreground line-through",
                    )}
                  >
                    {formatKes(p.amountKes)}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
