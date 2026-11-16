"use client"

import * as React from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

/** Colour follows the entity, never its rank: callers pass a stable index per entity. */
export const chartColor = (index: number) => `var(--chart-${(((index % 5) + 5) % 5) + 1})`

/** Bar and area opacities from the design spec (§3.2). One place to tune at the visual pass. */
export const BAR_FILL_OPACITY = 0.22
export const BAR_STROKE_OPACITY = 0.35
export const AREA_FILL_OPACITY = 0.14
export const GRID_STROKE_OPACITY = 0.25
export const BAR_SIZE = 14

export const defaultFormat = (value: number) => value.toLocaleString("en-KE")

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-01-02" → "2 Jan". Anything that is not a plain date passes through unchanged. */
export function formatDay(value: string | number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
  if (!match) return String(value)
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}`
}

/** A hover/focus tooltip for the HTML-based charts. Recharts charts use `KitTooltip` instead. */
export function HoverTip({
  tip,
  children,
}: {
  tip: React.ReactNode
  children: React.ReactElement
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

type TipItem = {
  name?: string | number
  value?: unknown
  color?: string
  stroke?: string
  fill?: string
  payload?: { fill?: string } & Record<string, unknown>
  type?: string
}

/** Tooltip body for Recharts charts: honours `valueFormatter`, which the stock content does not. */
export function KitTooltip({
  active,
  payload,
  label,
  valueFormatter = defaultFormat,
  formatLabel = formatDay,
}: {
  active?: boolean
  payload?: ReadonlyArray<TipItem>
  label?: string | number
  valueFormatter?: (value: number) => string
  formatLabel?: (label: string | number) => string
}) {
  const rows = (payload ?? []).filter((item) => item.type !== "none" && item.value != null)
  if (!active || rows.length === 0) return null

  return (
    <div className="grid min-w-32 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-md">
      {label !== undefined && label !== "" ? (
        <div className="font-medium">{formatLabel(label)}</div>
      ) : null}
      {rows.map((item, index) => {
        const swatch = item.payload?.fill ?? item.color ?? item.stroke ?? item.fill
        const raw = Array.isArray(item.value) ? null : item.value
        return (
          <div key={index} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: swatch }} aria-hidden />
            <span className="flex-1 text-muted-foreground">{item.name}</span>
            <span className="font-mono font-medium tabular-nums">
              {typeof raw === "number" ? valueFormatter(raw) : raw == null ? "—" : String(raw)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
