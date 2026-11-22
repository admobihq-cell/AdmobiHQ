import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, CircleCheck } from "lucide-react"
import { formatKes } from "@workspace/ops-contracts"

import { CountUp } from "@workspace/ui/components/dashboard/count-up"
import { DeltaPill } from "@workspace/ui/components/dashboard/delta-pill"
import { cn } from "@workspace/ui/lib/utils"

import { getOpsUser } from "@/lib/auth"
import { DashboardNav } from "@/components/dashboards/dashboard-nav"
import type { DateRangeKey } from "@/lib/queries/stats"
import { loadOverview } from "@/components/overview/overview-stats"
import { TrendLine } from "@/components/overview/trend-line"

const RANGE_LABEL: Record<DateRangeKey, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  all: "all time",
}

/** Chips shown on the banner before the rest fold into "+N more" on Notifications. */
const MAX_CHIPS = 3

const TONE_BADGE = {
  serious: "bg-destructive text-white",
  warning: "bg-amber-400 text-amber-950",
  neutral: "bg-white/20 text-white",
} as const

/**
 * The console's landing banner: the ops photo under a terracotta wash (the Finances card's brand
 * gradient, deepened so white text holds), a greeting, the period's headline figure with a small
 * running-total line, and what needs someone right now as glass chips. The greeting renders at
 * once; the figure, line and queue stream in per range. `dark` scopes the shared kit (DeltaPill,
 * chart tooltip) to its dark palette over the photo.
 */
export async function OverviewWelcome({ range }: { range: DateRangeKey }) {
  const user = await getOpsUser()
  const rawName = user?.user?.firstName?.trim() || user?.email.split("@")[0] || "there"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  return (
    <section className="dark relative isolate overflow-hidden rounded-2xl border text-white shadow-lg shadow-black/10">
      {/* Reused ops brand photo (also on the sign-in split screen). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- local static hero asset */}
      <img
        src="/auth/hero-ops.jpg"
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[oklch(0.24_0.05_40)]/90 via-[oklch(0.3_0.08_40)]/65 to-primary/25" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(0.2_0.04_40)]/70 via-transparent to-primary/10" />

      <div className="flex flex-col gap-5 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Welcome back, {displayName}</h1>
          {/* The page's only range control: it drives the banner and everything below. */}
          <DashboardNav range={range} />
        </div>
        <Suspense key={range} fallback={<PulseSkeleton />}>
          <BannerPulse range={range} />
        </Suspense>
      </div>
    </section>
  )
}

async function BannerPulse({ range }: { range: DateRangeKey }) {
  // Shares one load with OverviewStats through React cache; a failure is reported there.
  const data = await loadOverview(range).catch(() => null)
  if (!data) return null

  const { booked, bookedTrend, submissions, actions } = data
  const figure = booked
    ? { label: `Booked, ${RANGE_LABEL[range]}`, value: formatKes(booked.current), delta: booked }
    : submissions
      ? { label: `Submissions, ${RANGE_LABEL[range]}`, value: String(submissions.total), delta: null }
      : null
  const change = booked?.change ?? null
  const direction = change === null || change === 0 ? "flat" : change > 0 ? "up" : "down"
  const showLine = Boolean(booked && bookedTrend && bookedTrend.length > 1)

  const sorted = [...actions].sort(
    (a, b) => toneRank(a.tone) - toneRank(b.tone) || b.count - a.count,
  )
  const chips = sorted.slice(0, MAX_CHIPS)
  const more = sorted.length - chips.length
  const waiting = actions.reduce((sum, a) => sum + a.count, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end">
      {figure ? (
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/70">{figure.label}</p>
          <p className="mt-1 text-4xl leading-none font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums md:text-5xl">
            <CountUp value={figure.value} />
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {figure.delta && figure.delta.change !== null ? (
              <p className="flex items-center gap-1.5 text-xs text-white/70">
                <DeltaPill delta={figure.delta} good="up" />
                vs previous period
              </p>
            ) : null}
            {showLine ? (
              <div className="h-9 w-40 sm:w-48" title="KES booked so far, day by day">
                <TrendLine data={bookedTrend!} direction={direction} />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div />
      )}

      <div className="flex min-w-0 flex-col gap-2">
        {actions.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-medium text-white/85">
            <CircleCheck className="size-4 text-green-400" aria-hidden />
            All clear. Nothing needs you right now.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <span className="relative flex size-2" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {waiting} {waiting === 1 ? "thing needs" : "things need"} you
              </p>
              {more > 0 ? (
                <Link
                  href="/notifications"
                  className="rounded text-xs text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                >
                  +{more} more
                </Link>
              ) : null}
            </div>
            <ul className="flex flex-col gap-1.5">
              {chips.map((a, i) => (
                <li
                  key={a.href + a.title}
                  className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500 ease-out motion-reduce:animate-none"
                  style={{ animationDelay: `${120 + i * 70}ms` }}
                >
                  <Link
                    href={a.href}
                    className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                        TONE_BADGE[a.tone],
                      )}
                    >
                      {a.count > 99 ? "99+" : a.count}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.title}</span>
                      <span className="block truncate text-xs text-white/65">{a.meta}</span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                      aria-hidden
                    />
                    <span className="sr-only">{a.action}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function toneRank(tone: "serious" | "warning" | "neutral") {
  return tone === "serious" ? 0 : tone === "warning" ? 1 : 2
}

function PulseSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end" aria-hidden>
      <div className="space-y-2.5">
        <div className="h-4 w-36 animate-pulse rounded bg-white/15" />
        <div className="h-11 w-64 max-w-full animate-pulse rounded-lg bg-white/15 md:h-12" />
        <div className="h-5 w-56 animate-pulse rounded bg-white/10" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="mb-0.5 h-5 w-36 animate-pulse rounded bg-white/15" />
        {Array.from({ length: MAX_CHIPS }, (_, i) => (
          <div key={i} className="h-[3.25rem] animate-pulse rounded-xl bg-white/10" />
        ))}
      </div>
    </div>
  )
}

export function WelcomeSkeleton() {
  return <div className="h-[19rem] animate-pulse rounded-2xl border bg-muted lg:h-[15rem]" />
}
