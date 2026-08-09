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
import { Card, CardContent } from "@workspace/ui/components/card"
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

const WEIGHT_LABEL: Record<(typeof ROUTE_HISTORY)[number]["weight"], string> = {
  high: "High earner",
  medium: "Medium earner",
  low: "Low earner",
}

export function DriverRoutesView() {
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const preset = BASEMAP_PRESETS[basemap]

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            This week
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Your routes</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Where you've driven and which corridors are weighted heaviest for earnings.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
          <span className="size-2 rounded-full bg-primary" aria-hidden />
          Demo
        </div>
      </div>

      <Card className="shadow-none">
        <CardContent className="grid grid-cols-3 divide-x p-0">
          {ROUTE_STATS.map((stat) => (
            <div key={stat.label} className="px-4 py-3 text-center">
              <p className="text-base font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="relative h-[min(55vh,520px)] min-h-[380px] flex-1 overflow-hidden rounded-xl border bg-muted/30">
        <Map
          key={basemap}
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
        </Map>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Route breakdown
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROUTE_HISTORY.map((route) => (
            <Card key={route.id} className="shadow-none">
              <CardContent className="space-y-1.5 p-4">
                <p className="text-sm font-semibold">{route.name}</p>
                <p className="text-xs text-muted-foreground">{route.corridor}</p>
                <p className="text-xs text-muted-foreground">{route.hours}</p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm font-semibold text-primary">{route.earnings}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {WEIGHT_LABEL[route.weight]}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
