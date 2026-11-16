import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

export type StatusTone = "good" | "warning" | "serious" | "neutral"

const TONES: Record<StatusTone, string> = {
  good: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  warning: "bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  serious: "bg-destructive/10 text-destructive",
  neutral: "bg-secondary text-secondary-foreground",
}

/** Status colours are reserved for state, and always ship with a text label. */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
