"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { PAYOUT_STAGES, payoutFocus, type PayoutFocus } from "@workspace/ops-contracts"
import { Button } from "@workspace/ui/components/button"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { StatusPill, type StatusTone } from "@workspace/ui/components/dashboard/status-pill"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { formatKes, formatPayoutDate, monthName, PAYOUT_STATUS_LABEL, useDriverPayouts } from "@/lib/use-driver-payouts"

export const PAYOUT_DETAILS_HREF = "/settings/account"
export const SUPPORT_HREF = "/settings/support"

export const PAYOUT_TONE: Record<string, StatusTone> = {
  settled: "good",
  pending: "neutral",
  processing: "warning",
  failed: "serious",
  reversed: "serious",
}

function sentence(focus: Exclude<PayoutFocus, { kind: "none" }>, to: string): string {
  if (focus.kind === "paid") {
    return `Paid to ${to}${focus.payout.paidAt ? ` on ${formatPayoutDate(focus.payout.paidAt)}` : ""}.`
  }
  if (focus.kind === "in_flight") return focus.stage === 0 ? `Saved and queued to send to ${to}.` : `Sending now to ${to}.`
  return focus.payout.status === "reversed"
    ? `This payment to ${to} was reversed. Check your payout details, or ask support what happened.`
    : `This payment to ${to} didn't go through. Usually the number or account is wrong.`
}

/** Saved → Sending → Paid as three segments; a problem stops the bar in red at its stage. */
function StageBar({ focus }: { focus: Exclude<PayoutFocus, { kind: "none" }> }) {
  const problem = focus.kind === "problem"
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label="Payout progress">
      {PAYOUT_STAGES.map((label, i) => {
        const reached = i <= focus.stage
        const current = i === focus.stage
        return (
          <li key={label} className="space-y-1.5" aria-current={current ? "step" : undefined}>
            <span
              aria-hidden
              className={cn(
                "block h-1.5 rounded-full",
                !reached ? "bg-muted" : problem && current ? "bg-destructive" : "bg-primary",
              )}
            />
            <span className={cn("block text-xs", reached ? "font-medium text-foreground" : "text-muted-foreground")}>
              {label}
              <span className="sr-only">{reached ? (problem && current ? ", stopped here" : ", done") : ", not yet"}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** The newest payout, wherever it is. Real data; the hero and history on Earnings share its query. */
export function LatestPayoutCard({
  destination,
  showHistoryLink = false,
  className,
}: {
  /** "M-Pesa ••• 4521"; null when the profile has no payout details. */
  destination: string | null
  showHistoryLink?: boolean
  className?: string
}) {
  const { data, isError, isFetching, refetch } = useDriverPayouts()
  const to = destination ?? "your M-Pesa or bank"

  const action = showHistoryLink ? (
    <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
      <Link href="/earnings">
        All payouts
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </Button>
  ) : undefined

  if (isError && !data) {
    return (
      <DashboardCard title="Latest payout" description="The newest month Admobi saved for you" action={action} className={className}>
        <div aria-live="polite" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your payouts didn&apos;t load. Your money is safe; this is a connection problem.
          </p>
          <Button variant="outline" loading={isFetching} loadingText="Trying again…" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </DashboardCard>
    )
  }

  if (!data) {
    return (
      <DashboardCard title="Latest payout" description="The newest month Admobi saved for you" className={className}>
        <div className="space-y-3" aria-busy="true" aria-label="Loading your latest payout">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </DashboardCard>
    )
  }

  const focus = payoutFocus(data)

  if (focus.kind === "none") {
    return (
      <DashboardCard title="Latest payout" description="The newest month Admobi saved for you" action={action} className={className}>
        <p className="text-2xl font-semibold tracking-tight">No payouts yet</p>
        <p className="text-sm text-muted-foreground">
          Admobi pays you monthly, straight to {to}. Your first payout shows here as soon as it&apos;s saved.
        </p>
      </DashboardCard>
    )
  }

  const { payout } = focus
  const problem = focus.kind === "problem"

  return (
    <DashboardCard
      title="Latest payout"
      description={`For ${monthName(payout.periodMonth)}`}
      action={action}
      className={className}
      footer={
        problem ? (
          <div className="flex w-full flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={PAYOUT_DETAILS_HREF}>Check payout details</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={SUPPORT_HREF}>Ask support</Link>
            </Button>
          </div>
        ) : (
          <dl className="grid w-full grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Paid this year</dt>
              <dd className="font-medium tabular-nums">{formatKes(data.summary.paidThisYearKes)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">On its way</dt>
              <dd className="font-medium tabular-nums">{formatKes(data.summary.pendingKes)}</dd>
            </div>
          </dl>
        )
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            problem && "text-muted-foreground line-through decoration-destructive/60",
          )}
        >
          {formatKes(payout.amountKes)}
        </p>
        <StatusPill tone={PAYOUT_TONE[payout.status] ?? "serious"}>
          {PAYOUT_STATUS_LABEL[payout.status] ?? payout.status}
        </StatusPill>
      </div>
      <StageBar focus={focus} />
      <p className="text-sm text-muted-foreground">{sentence(focus, to)}</p>
    </DashboardCard>
  )
}
