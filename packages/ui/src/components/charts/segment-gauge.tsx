import { chartColor } from "@workspace/ui/components/charts/shared"
import { cn } from "@workspace/ui/lib/utils"

const SEGMENTS = 10

/** A ten-segment gauge for "how much of the whole": delivery rate, funds used. */
export function SegmentGauge({
  value,
  max,
  label,
  className,
}: {
  value: number
  max: number
  label: string
  className?: string
}) {
  const ratio = max > 0 && Number.isFinite(value) ? Math.min(1, Math.max(0, value / max)) : 0
  const filled = Math.round(ratio * SEGMENTS)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{Math.round(ratio * 100)}%</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="flex h-2.5 gap-0.5"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className="h-full flex-1 rounded-[2px] bg-muted"
            style={i < filled ? { background: chartColor(0) } : undefined}
          />
        ))}
      </div>
    </div>
  )
}
