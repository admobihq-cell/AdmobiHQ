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

/**
 * Mark specs, one place for every chart: bars/columns cap at 24px with a 4px rounded data-end
 * (square at the baseline); 2px lines; 8px dots with a 2px surface ring; area washes fade from
 * 18% at the top to nothing at the baseline; on hover the active mark keeps full weight and the
 * rest drop to `dim`.
 */
export const MARK = { barMax: 24, radius: 4, line: 2, dot: 4, ring: 2, dim: 0.35, washTop: 0.18 } as const

/** Solid fills: the rounded data-end and the track carry the look, not a tinted outline. */
export const BAR_FILL_OPACITY = 1
export const BAR_STROKE_OPACITY = 0
export const AREA_FILL_OPACITY = 0.1
export const GRID_STROKE_OPACITY = 0.25
export const BAR_SIZE = 14

/** Recharts `radius` for a rounded data-end and a square baseline. */
export function dataEndRadius(
  orientation: "vertical" | "horizontal",
  negative = false
): [number, number, number, number] {
  const r = MARK.radius
  if (orientation === "horizontal") return negative ? [r, 0, 0, r] : [0, r, r, 0]
  return negative ? [0, 0, r, r] : [r, r, 0, 0]
}

/** One vertical wash per series: the hue at MARK.washTop fading to transparent at the baseline. */
export function WashGradients({ ids }: { ids: { id: string; color: string }[] }) {
  return (
    <defs>
      {ids.map(({ id, color }) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={MARK.washTop} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  )
}

/** Hover state for bar/cell charts: the active mark keeps full weight, the rest dim. */
export function useActiveMark() {
  const [active, set] = React.useState<number | null>(null)
  const opacityOf = React.useCallback(
    (index: number) => (active === null || active === index ? 1 : MARK.dim),
    [active]
  )
  return { active, set, opacityOf }
}

/** CSS for marks whose opacity changes on hover. */
export const DIM_TRANSITION = { transition: "opacity 120ms ease-out" } as const

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
