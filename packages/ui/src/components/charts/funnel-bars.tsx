"use client"

import { HoverTip, chartColor, defaultFormat } from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

/** Steps of a process, each bar sized against the first, with the step-to-step carry-over. */
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

  return (
    <ol className={cn("flex flex-col gap-2", className)}>
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1]!.value : null
        const carry = previous && previous > 0 ? Math.round((step.value / previous) * 100) : null
        const width = first > 0 ? (step.value / first) * 100 : 0
        return (
          <li key={step.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{step.label}</span>
              <span className="font-medium tabular-nums">{valueFormatter(step.value)}</span>
              <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                {carry === null ? "" : `${carry}% of previous`}
              </span>
            </div>
            <HoverTip tip={`${step.label}: ${valueFormatter(step.value)}${carry === null ? "" : ` (${carry}% of previous step)`}`}>
              <div tabIndex={0} className="h-3 rounded-sm bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${width}%`, background: chartColor(0), opacity: 0.8 }}
                />
              </div>
            </HoverTip>
          </li>
        )
      })}
    </ol>
  )
}
