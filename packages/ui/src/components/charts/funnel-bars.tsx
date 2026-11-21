"use client"

import {
  DIM_TRANSITION,
  HoverTip,
  chartColor,
  defaultFormat,
  useActiveMark,
} from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Steps of a process as a ribbon funnel: each step a rounded bar on a track sized against the
 * first, joined to the next by a soft ribbon that narrows to what carried over. One hue, because
 * the steps are ordered, not separate entities. Hovering a step lifts it and dims the others.
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
  const first = steps[0]?.value ?? 0
  const widthOf = (value: number) => (first > 0 ? Math.max(0, Math.min(100, (value / first) * 100)) : 0)
  const { set, opacityOf } = useActiveMark()

  return (
    <ol className={cn("flex flex-col", className)} onMouseLeave={() => set(null)}>
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1]!.value : null
        const carry = previous && previous > 0 ? Math.round((step.value / previous) * 100) : null
        const ofFirst = first > 0 ? Math.round((step.value / first) * 100) : 0
        const width = widthOf(step.value)
        const next = steps[index + 1]
        return (
          <li key={step.label} className="flex flex-col">
            <div className="flex items-center gap-2 pb-1 text-sm">
              <span className="min-w-0 flex-1 truncate">{step.label}</span>
              <span className="font-medium tabular-nums">{valueFormatter(step.value)}</span>
              <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                {carry === null ? "" : `${carry}% of previous`}
              </span>
            </div>
            <HoverTip tip={`${step.label}: ${valueFormatter(step.value)} (${ofFirst}% of ${steps[0]!.label.toLowerCase()})`}>
              <div
                tabIndex={0}
                onMouseEnter={() => set(index)}
                onFocus={() => set(index)}
                onBlur={() => set(null)}
                className="relative h-4 overflow-hidden rounded-full bg-chart-track outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div
                  className="flex h-full items-center rounded-full pl-1"
                  style={{ width: `${width}%`, background: chartColor(0), opacity: opacityOf(index), ...DIM_TRANSITION }}
                >
                  {width >= 14 ? (
                    <span className="rounded-full bg-background/85 px-1.5 text-[10px] leading-3 font-medium tabular-nums text-foreground">
                      {ofFirst}%
                    </span>
                  ) : null}
                </div>
              </div>
            </HoverTip>
            {next ? (
              // The ribbon: from this bar's width down to the next one's, so the drop-off reads as a shape.
              <svg className="h-3 w-full" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
                <polygon
                  points={`0,0 ${width},0 ${widthOf(next.value)},12 0,12`}
                  fill={chartColor(0)}
                  fillOpacity={0.12}
                />
              </svg>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
