"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight, Check, X } from "lucide-react"

import { PAYOUT_STAGES, payoutFocus, type PayoutFocus } from "@workspace/ops-contracts"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import {
  formatKes,
  formatPayoutDate,
  monthName,
  PAYOUT_STATUS_LABEL,
  useDriverPayouts,
} from "@/lib/use-driver-payouts"

type Props = {
  /** "M-Pesa ••• 4521"; null when the profile has no payout details. */
  destination: string | null
  /** Dashboard links through to the full history; Earnings already is it. */
  showHistoryLink?: boolean
}

/**
 * The driver's one question, answered first: what is coming to my M-Pesa, and
 * where is it. The newest payout leads, drawn as a three-stop route
 * (Saved → Sending → Paid) — the same path-and-node language as the rest of
 * Admobi — with the year's totals as a quiet line underneath.
 */
export function PayoutHero({ destination, showHistoryLink = false }: Props) {
  const { data, isError, isFetching, refetch } = useDriverPayouts()
  const to = destination ?? "your M-Pesa or bank"

  if (isError && !data) {
    return (
      <section className="rounded-2xl border bg-card p-6 sm:p-8" aria-live="polite">
        <p className="text-lg font-semibold">We couldn&apos;t load your payouts</p>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Your money is safe. This is a connection problem on our side or yours. Try again in a moment.
        </p>
        <Button
          className="mt-5 h-11 px-5"
          variant="outline"
          loading={isFetching}
          loadingText="Trying again…"
          onClick={() => void refetch()}
        >
          Try again
        </Button>
      </section>
    )
  }

  if (!data) return <PayoutHeroSkeleton />

  const focus = payoutFocus(data)
  const { summary } = data

  return (
    <section
      aria-labelledby="payout-hero-heading"
      className="animate-in fade-in rounded-2xl border bg-card p-6 duration-300 motion-reduce:animate-none sm:p-8"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 id="payout-hero-heading" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <StatusDot focus={focus} />
            {headingFor(focus)}
          </h2>
          {focus.kind === "none" ? (
            <p className="text-3xl font-semibold tracking-tight sm:text-4xl">No payouts yet</p>
          ) : (
            <p
              className={cn(
                "text-5xl font-semibold tracking-[-0.035em] tabular-nums sm:text-6xl",
                focus.kind === "problem" && "text-muted-foreground line-through decoration-destructive/60 decoration-2",
              )}
            >
              {formatKes(focus.payout.amountKes)}
            </p>
          )}
          <p className="max-w-prose text-base text-muted-foreground">{sentenceFor(focus, to)}</p>
        </div>

        <PayoutRoute focus={focus} className="w-full shrink-0 lg:w-80" />
      </div>

      {focus.kind === "problem" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="h-11 px-5">
            <Link href="/settings/account">Check payout details</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-5">
            <Link href="/settings/support">Ask support</Link>
          </Button>
        </div>
      ) : null}

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:flex sm:flex-wrap sm:gap-x-10">
        <Figure label="Paid this year" value={formatKes(summary.paidThisYearKes)} />
        <Figure label="On its way" value={formatKes(summary.pendingKes)} />
        {focus.kind !== "paid" && summary.lastPayout ? (
          <Figure
            label={`Last paid ${formatPayoutDate(summary.lastPayout.paidAt)}`}
            value={formatKes(summary.lastPayout.amountKes)}
          />
        ) : null}
        {showHistoryLink ? (
          <Link
            href="/earnings"
            className="col-span-2 inline-flex items-center gap-1.5 self-end text-sm font-medium text-primary underline-offset-4 hover:underline sm:ml-auto"
          >
            All payouts
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </dl>
    </section>
  )
}

function headingFor(focus: PayoutFocus): string {
  switch (focus.kind) {
    case "none":
      return "Your payouts"
    case "in_flight":
      return `${monthName(focus.payout.periodMonth)} payout · on its way`
    case "paid":
      return `${monthName(focus.payout.periodMonth)} payout · paid`
    case "problem":
      return `${monthName(focus.payout.periodMonth)} payout · ${(PAYOUT_STATUS_LABEL[focus.payout.status] ?? focus.payout.status).toLowerCase()}`
  }
}

function sentenceFor(focus: PayoutFocus, to: string): string {
  switch (focus.kind) {
    case "none":
      return `Admobi pays you straight to ${to}. Your first payout shows up here as soon as it's saved.`
    case "in_flight":
      return focus.stage === 0
        ? `Saved by Admobi and queued to send to ${to}.`
        : `Sending now to ${to}.`
    case "paid":
      return `Paid to ${to}${focus.payout.paidAt ? ` on ${formatPayoutDate(focus.payout.paidAt)}` : ""}.`
    case "problem":
      return focus.payout.status === "reversed"
        ? `This payment to ${to} was reversed. Check your payout details, or ask support what happened.`
        : `This payment to ${to} didn't go through. Usually the number or account is wrong. Check it, or ask support.`
  }
}

function StatusDot({ focus }: { focus: PayoutFocus }) {
  if (focus.kind === "problem") return <AlertTriangle className="size-4 text-destructive" aria-hidden />
  return <span aria-hidden className={cn("size-2 rounded-full", focus.kind === "none" ? "bg-border" : "bg-primary")} />
}

/** Saved → Sending → Paid, as nodes on a line. */
export function PayoutRoute({ focus, className }: { focus: PayoutFocus; className?: string }) {
  const reached = focus.kind === "none" ? -1 : focus.stage

  return (
    <ol className={cn("flex items-start", className)} aria-label="Payout progress">
      {PAYOUT_STAGES.map((label, i) => {
        const isProblem = focus.kind === "problem" && i === reached
        const isCurrent = focus.kind === "in_flight" && i === reached
        const isDone = i < reached || (focus.kind === "paid" && i === reached)
        const text = isProblem ? (PAYOUT_STATUS_LABEL[focus.payout.status] ?? label) : label
        const state = isProblem ? "stopped here" : isCurrent ? "in progress" : isDone ? "done" : "not yet"

        return (
          <li
            key={label}
            className="flex flex-1 flex-col gap-2 last:flex-none"
            aria-current={isCurrent || isProblem ? "step" : undefined}
          >
            <div className="flex items-center">
              <span
                aria-hidden
                className={cn(
                  "relative flex size-5 shrink-0 items-center justify-center rounded-full",
                  isProblem && "bg-destructive text-white",
                  isDone && "bg-primary text-primary-foreground",
                  isCurrent && "border-2 border-primary bg-background",
                  !isProblem && !isDone && !isCurrent && "border-2 border-border bg-background",
                )}
              >
                {isDone ? <Check className="size-3" strokeWidth={3} /> : null}
                {isProblem ? <X className="size-3" strokeWidth={3} /> : null}
                {isCurrent ? (
                  <>
                    <span className="size-2 rounded-full bg-primary" />
                    <span className="anim-pulse absolute inset-0 rounded-full border-2 border-primary" />
                  </>
                ) : null}
              </span>
              {i < PAYOUT_STAGES.length - 1 ? (
                <span
                  aria-hidden
                  className={cn("mx-1.5 h-0.5 flex-1 rounded-full", i < reached ? "bg-primary" : "bg-border")}
                />
              ) : null}
            </div>
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                isProblem ? "text-destructive" : isDone || isCurrent ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {text}
              <span className="sr-only">, {state}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

export function PayoutHeroSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8" aria-busy="true" aria-label="Loading your payouts">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-14 w-64 sm:h-16" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full lg:w-80" />
      </div>
      <div className="mt-8 flex gap-10 border-t pt-5">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}
