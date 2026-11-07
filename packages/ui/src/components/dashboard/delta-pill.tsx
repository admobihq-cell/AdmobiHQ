import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import type { Delta } from "@workspace/ops-contracts"

import { cn } from "@workspace/ui/lib/utils"

/** Which direction counts as an improvement. Spend rising is "neutral" for an advertiser. */
export type DeltaGood = "up" | "down" | "neutral"

const TONES = {
  good: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  bad: "bg-destructive/10 text-destructive",
  neutral: "bg-secondary text-secondary-foreground",
} as const

/**
 * Change against the previous period. Colour follows meaning, not sign, and the arrow icon
 * means colour is never the only cue. Renders nothing when there is nothing to compare
 * (`change === null`, e.g. the "All" range), rather than a misleading 0%.
 */
export function DeltaPill({
  delta,
  good,
  format,
  className,
}: {
  delta: Delta
  good: DeltaGood
  /** Formats the percent change; defaults to "12.3%". */
  format?: (change: number) => string
  className?: string
}) {
  const change = delta.change
  if (change === null || !Number.isFinite(change)) return null

  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat"
  const tone =
    direction === "flat" || good === "neutral"
      ? "neutral"
      : direction === good
        ? "good"
        : "bad"
  const Icon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus
  const text = format ? format(Math.abs(change)) : `${Math.abs(change).toFixed(1)}%`

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-xs font-medium tabular-nums",
        TONES[tone],
        className
      )}
      aria-label={`${direction === "flat" ? "No change" : direction === "up" ? `Up ${text}` : `Down ${text}`} on the previous period`}
    >
      <Icon className="size-3" aria-hidden />
      {direction === "flat" ? "0%" : text}
    </span>
  )
}
