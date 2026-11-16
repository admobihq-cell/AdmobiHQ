import type * as React from "react"

import { Card } from "@workspace/ui/components/card"

/** A card for one item in flight (a campaign): title, status, a progress bar, and a footer line. */
export function ProgressCard({
  title,
  status,
  subtitle,
  percent,
  footer,
  href,
  LinkComponent = "a",
}: {
  title: React.ReactNode
  status?: React.ReactNode
  subtitle?: React.ReactNode
  /** 0–100; clamped. */
  percent: number
  footer?: React.ReactNode
  href?: string
  LinkComponent?: React.ElementType
}) {
  const value = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
  const heading = <span className="truncate text-sm font-medium">{title}</span>

  return (
    <Card size="sm" className="gap-3 shadow-xs">
      <div className="flex items-start justify-between gap-2 px-(--card-spacing)">
        <div className="flex min-w-0 flex-col gap-0.5">
          {href ? (
            <LinkComponent href={href} className="truncate hover:underline">
              {heading}
            </LinkComponent>
          ) : (
            heading
          )}
          {subtitle ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}
        </div>
        {status}
      </div>
      <div className="px-(--card-spacing)">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value)}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-foreground/70" style={{ width: `${value}%` }} />
        </div>
      </div>
      {footer ? (
        <div className="flex items-center justify-between gap-2 px-(--card-spacing) text-xs text-muted-foreground tabular-nums">
          {footer}
        </div>
      ) : null}
    </Card>
  )
}
