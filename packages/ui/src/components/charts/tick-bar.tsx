import { cn } from "@workspace/ui/lib/utils"

const TICKS = 12

const TONES = {
  good: "bg-green-600 dark:bg-green-400",
  warning: "bg-amber-600 dark:bg-amber-400",
  serious: "bg-destructive",
  neutral: "bg-foreground/60",
} as const

/**
 * A thin tick bar for a table row, e.g. delivery rate. The real percentage is always printed
 * beside it, so the tone is a hint rather than the message. `percent` null reads "—".
 */
export function TickBar({
  percent,
  tone,
  className,
}: {
  percent: number | null
  tone: keyof typeof TONES
  className?: string
}) {
  const filled =
    percent === null || !Number.isFinite(percent)
      ? 0
      : Math.round((Math.min(100, Math.max(0, percent)) / 100) * TICKS)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="meter"
        aria-label="Delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="flex h-4 w-20 items-end gap-px"
      >
        {Array.from({ length: TICKS }, (_, i) => (
          <span key={i} className={cn("h-full flex-1 rounded-[1px]", i < filled ? TONES[tone] : "bg-muted")} />
        ))}
      </div>
      <span className="text-xs tabular-nums">{percent === null ? "—" : `${Math.round(percent)}%`}</span>
    </div>
  )
}
