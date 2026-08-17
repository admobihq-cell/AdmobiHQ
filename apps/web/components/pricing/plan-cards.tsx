import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { planTiers } from "@/lib/seo/pricing-data"

const DOT_GRID = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [1, 1], [2, 1], [3, 1],
  [0, 2], [1, 2], [2, 2], [3, 2],
] as const

type DotMapVariant = "partial" | "full" | "exclusive"

const PARTIAL_ACTIVE = new Set([1, 4, 6, 9, 10])
const EXCLUSIVE_RING_INDEX = 5

function DotMap({ variant }: { variant: DotMapVariant }) {
  const activeSet =
    variant === "full"
      ? new Set(DOT_GRID.map((_, i) => i))
      : variant === "partial"
        ? PARTIAL_ACTIVE
        : new Set([EXCLUSIVE_RING_INDEX])

  return (
    <svg viewBox="0 0 84 60" className="h-12 w-[4.5rem]" aria-hidden>
      {DOT_GRID.map(([col, row], i) => {
        const cx = 10 + col * 22
        const cy = 8 + row * 22
        const active = activeSet.has(i)
        const ringed = variant === "exclusive" && i === EXCLUSIVE_RING_INDEX
        return (
          <g key={`${col}-${row}`}>
            <circle cx={cx} cy={cy} r={4} className={active ? "fill-primary" : "fill-muted-foreground/25"} />
            {ringed ? (
              <circle
                cx={cx}
                cy={cy}
                r={8}
                fill="none"
                className="stroke-primary"
                strokeWidth={1.4}
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

const dotMapVariants: Record<string, DotMapVariant> = {
  "zone-select": "partial",
  "all-screens": "full",
  enterprise: "exclusive",
}

export function PlanCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {planTiers.map((plan) => {
        const featured = plan.id === "all-screens"
        return (
          <div
            key={plan.id}
            className={cn(
              "flex flex-col rounded-xl border p-6 sm:p-7",
              featured
                ? "border-primary bg-primary/[0.04] lg:-translate-y-2 lg:shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_20px_36px_-20px_rgb(0_0_0_/_0.35)]"
                : plan.id === "enterprise"
                  ? "border-dashed border-border bg-transparent"
                  : "border-border bg-card",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">{plan.name}</h3>
                <p className="text-primary mt-1 text-sm font-medium">{plan.tagline}</p>
              </div>
              <DotMap variant={dotMapVariants[plan.id] ?? "partial"} />
            </div>

            {featured ? (
              <span className="mt-4 inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-primary-foreground">
                Simplest setup
              </span>
            ) : null}

            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{plan.description}</p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.bullets.map((bullet) => (
                <li key={bullet} className="text-foreground flex gap-2.5 text-sm leading-relaxed">
                  <span aria-hidden className="text-primary mt-[0.55em] block size-1 shrink-0 rounded-full bg-current" />
                  {bullet}
                </li>
              ))}
            </ul>

            <div className="border-border mt-6 border-t pt-5">
              <p className="text-foreground text-sm font-medium tabular-nums">{plan.priceNote}</p>
              <Button asChild variant={featured ? "default" : "outline"} className="mt-4 w-full">
                <Link href={plan.cta === "quote" ? "/start-campaign" : "#simulator"}>
                  {plan.cta === "quote" ? "Request a quote" : "Try the simulator"}
                </Link>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
