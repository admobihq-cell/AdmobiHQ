"use client"

import * as React from "react"

import {
  DIM_TRANSITION,
  chartColor,
  defaultFormat,
  useActiveMark,
} from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

/** SVG units; the shape stretches to the container, labels are HTML on top so text never distorts. */
const W = 1000
const H = 200
const MID = H / 2
/** The thickest core band, leaving room above and below for the halos. */
const CORE_MAX = MID * 0.74
/** A stage with almost nothing still shows as a thin line, never vanishes. */
const MIN_SHARE = 0.035
/** Two soft halos widen the band, like light around the flow. */
const HALOS = [
  { pad: 0.2, opacity: 0.12 },
  { pad: 0.1, opacity: 0.2 },
] as const
/** Where in a stage the flow starts bending toward the next stage's size. */
const BEND_START = 0.55

/**
 * Steps of a process as a funnel: a horizontal band whose thickness at each stage is its share of
 * the first, bending smoothly into the next, with soft halos around it. Each stage shows its count,
 * its share of the first as a pill, and its label; hover (or focus) a stage for how much carried
 * over from the one before. One hue, deepening stage by stage, because the steps are ordered,
 * not separate entities.
 */
export function FunnelBars({
  steps,
  valueFormatter = defaultFormat,
  className,
}: {
  steps: { label: string; value: number }[]
  valueFormatter?: (value: number) => string
  className?: string
}) {
  const { active, set, opacityOf } = useActiveMark()
  const n = steps.length
  if (n === 0) return null

  const first = steps[0]!.value
  const share = (value: number) => (first > 0 ? Math.max(0, Math.min(1, value / first)) : 0)
  const half = (value: number) => CORE_MAX * Math.max(MIN_SHARE, share(value))
  const stageW = W / n

  // One closed band per stage: flat at its own size, then a smooth S-curve to the next stage's.
  const bandPath = (i: number, pad: number) => {
    const a = half(steps[i]!.value) + CORE_MAX * pad
    const next = steps[i + 1]
    const b = (next ? half(next.value) : half(steps[i]!.value)) + CORE_MAX * pad
    const x0 = i * stageW
    const x1 = x0 + stageW
    const xm = x0 + stageW * BEND_START
    const xc = (xm + x1) / 2
    return [
      `M ${x0} ${MID - a}`,
      `L ${xm} ${MID - a}`,
      `C ${xc} ${MID - a} ${xc} ${MID - b} ${x1} ${MID - b}`,
      `L ${x1} ${MID + b}`,
      `C ${xc} ${MID + b} ${xc} ${MID + a} ${xm} ${MID + a}`,
      `L ${x0} ${MID + a}`,
      "Z",
    ].join(" ")
  }
  // Deeper stages read darker, like the flow concentrating.
  const coreOpacity = (i: number) => (n === 1 ? 1 : 0.55 + (0.45 * i) / (n - 1))

  return (
    <div className={cn("relative h-60 w-full select-none", className)} onMouseLeave={() => set(null)}>
      <svg
        className="absolute inset-x-0 top-9 bottom-9 h-[calc(100%-4.5rem)] w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {steps.map((step, i) => (
          <g key={step.label} style={{ opacity: opacityOf(i), ...DIM_TRANSITION }}>
            {HALOS.map((halo) => (
              <path key={halo.pad} d={bandPath(i, halo.pad)} fill={chartColor(0)} fillOpacity={halo.opacity} />
            ))}
            <path d={bandPath(i, 0)} fill={chartColor(0)} fillOpacity={coreOpacity(i)} />
          </g>
        ))}
      </svg>

      <ol className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {steps.map((step, i) => {
          const previous = i > 0 ? steps[i - 1]!.value : null
          const carry = previous && previous > 0 ? Math.round((step.value / previous) * 100) : null
          const ofFirst = Math.round(share(step.value) * 100)
          return (
            <li
              key={step.label}
              tabIndex={0}
              onMouseEnter={() => set(i)}
              onFocus={() => set(i)}
              onBlur={() => set(null)}
              aria-label={`${step.label}: ${valueFormatter(step.value)}, ${ofFirst}% of ${steps[0]!.label.toLowerCase()}${carry === null ? "" : `, ${carry}% of ${steps[i - 1]!.label.toLowerCase()}`}`}
              className={cn(
                "flex min-w-0 flex-col items-center justify-between py-1 text-center outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring",
                i > 0 && "border-l border-border/70"
              )}
            >
              <span className="text-lg font-semibold tracking-tight tabular-nums">{valueFormatter(step.value)}</span>
              <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background tabular-nums shadow-sm">
                {ofFirst}%
              </span>
              <span className="flex max-w-full flex-col items-center px-1">
                <span className="max-w-full truncate text-sm text-muted-foreground">{step.label}</span>
                <span
                  className={cn(
                    "h-4 text-[11px] text-muted-foreground/80 tabular-nums transition-opacity duration-150",
                    active === i && carry !== null ? "opacity-100" : "opacity-0"
                  )}
                >
                  {carry === null ? "" : `${carry}% of previous`}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
