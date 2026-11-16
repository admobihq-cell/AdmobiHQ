import type * as React from "react"
import { TriangleAlert } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/** A lever the viewer can pull, e.g. "Extend by 7 days". */
export function LeverTile({
  label,
  children,
  className,
}: {
  label: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-md border bg-muted/20 px-2.5 py-2", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {children ? <div className="text-sm font-medium">{children}</div> : null}
    </div>
  )
}

/** Inline facts on the left, one small action on the right. */
export function OwnerStrip({
  facts,
  action,
  className,
}: {
  facts: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{facts}</div>
      {action}
    </div>
  )
}

/** A plain-language conclusion drawn from the data above it. */
export function InsightNote({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "rounded-md border border-dashed bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  )
}

/** One message, one button. For low funding, rejected creative, missing billing details. */
export function AlertStrip({
  title,
  body,
  action,
  className,
}: {
  title: React.ReactNode
  body?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5",
        className
      )}
    >
      <TriangleAlert className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {body ? <p className="text-xs text-muted-foreground">{body}</p> : null}
      </div>
      {action}
    </div>
  )
}
