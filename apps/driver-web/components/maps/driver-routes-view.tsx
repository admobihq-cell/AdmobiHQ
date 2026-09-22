"use client"

import { MapCanvas } from "@workspace/ui/components/map-canvas"
import { cn } from "@workspace/ui/lib/utils"
import { ROUTE_HISTORY } from "@/lib/placeholder-data"

const ROUTE_SUMMARY = [
  { value: "3", label: "Routes driven" },
  { value: "27.5", label: "Screen-on hrs" },
  { value: "CBD Loop", label: "Top earner" },
] as const

const WEIGHT_STYLE: Record<
  (typeof ROUTE_HISTORY)[number]["weight"],
  { dot: string; label: string }
> = {
  high: { dot: "bg-primary", label: "High earner" },
  medium: { dot: "bg-primary/45", label: "Medium earner" },
  low: { dot: "bg-muted-foreground/40", label: "Low earner" },
}

export function DriverRoutesView() {
  return (
    <MapCanvas
      title="Your routes"
      description="Where you've driven this week, weighted by earnings."
      summary={ROUTE_SUMMARY.map((stat) => ({ ...stat }))}
      note="Illustrative data — not yet live"
      loadingLabel="Loading your routes"
    >
      {ROUTE_HISTORY.map((route, index) => (
        <div key={route.id} className="flex items-start gap-3 px-4 py-3.5">
          <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-semibold">{route.name}</p>
              <p className="shrink-0 text-sm font-semibold text-primary">
                {route.earnings}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{route.corridor}</p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  WEIGHT_STYLE[route.weight].dot,
                )}
                aria-hidden
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                {WEIGHT_STYLE[route.weight].label} · {route.hours}
              </span>
            </div>
          </div>
        </div>
      ))}
    </MapCanvas>
  )
}
