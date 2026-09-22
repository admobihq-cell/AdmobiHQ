"use client"

import { useState } from "react"

import {
  BASEMAP_ORDER,
  BASEMAP_PRESETS,
  DEFAULT_BASEMAP,
  NAIROBI_CENTER,
  NAIROBI_DEFAULT_ZOOM,
  type BasemapId,
} from "@workspace/geo"
import { MapBasemapSelect } from "@workspace/ui/components/map-basemap-select"
import {
  Map,
  MapBuildings3D,
  MapControls,
  MapPitch,
} from "@workspace/ui/components/map"
import { cn } from "@workspace/ui/lib/utils"
import { ROUTE_HISTORY } from "@/lib/placeholder-data"

const ROUTE_STATS = [
  { value: "3", label: "Routes driven" },
  { value: "27.5", label: "Screen-on hrs" },
  { value: "CBD Loop", label: "Top earner" },
] as const

const BASEMAP_OPTIONS = BASEMAP_ORDER.map((id) => ({
  id,
  label: BASEMAP_PRESETS[id].label,
  description: BASEMAP_PRESETS[id].description,
}))

const WEIGHT_STYLE: Record<
  (typeof ROUTE_HISTORY)[number]["weight"],
  { dot: string; label: string }
> = {
  high: { dot: "bg-primary", label: "High earner" },
  medium: { dot: "bg-primary/45", label: "Medium earner" },
  low: { dot: "bg-muted-foreground/40", label: "Low earner" },
}

export function DriverRoutesView() {
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const preset = BASEMAP_PRESETS[basemap]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Your routes</h1>
          <p className="text-sm text-muted-foreground">
            Where you've driven this week and which corridors are weighted
            heaviest for earnings.
          </p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          Illustrative data — not yet live
        </p>
      </div>

      <div className="grid flex-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative h-[min(60vh,560px)] min-h-[420px] overflow-hidden rounded-xl border bg-muted/30 lg:h-auto">
          <Map
            key={basemap}
            loadingLabel="Loading your routes"
            center={NAIROBI_CENTER}
            zoom={NAIROBI_DEFAULT_ZOOM}
            pitch={preset.pitch}
            maxPitch={68}
            className="absolute inset-0 h-full w-full"
            styles={{ light: preset.light, dark: preset.dark }}
          >
            <MapBasemapSelect
              value={basemap}
              onValueChange={(value) => setBasemap(value as BasemapId)}
              options={BASEMAP_OPTIONS}
            />
            <MapPitch pitch={preset.pitch} />
            <MapBuildings3D enabled={preset.buildings} />
            <MapControls
              showZoom
              showFullscreen
              showCompass
              position="bottom-right"
            />

            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
              <div className="pointer-events-auto flex divide-x divide-border/70 overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-sm backdrop-blur-sm">
                {ROUTE_STATS.map((stat) => (
                  <div key={stat.label} className="flex-1 px-4 py-2.5">
                    <p className="text-sm font-semibold leading-none">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Map>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Route breakdown</h2>
          </div>
          <div className="flex-1 divide-y overflow-y-auto lg:max-h-[520px]">
            {ROUTE_HISTORY.map((route, index) => (
              <div key={route.id} className="flex items-start gap-3 px-4 py-3.5">
                <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {route.name}
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-primary">
                      {route.earnings}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {route.corridor}
                  </p>
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
          </div>
        </div>
      </div>
    </div>
  )
}
