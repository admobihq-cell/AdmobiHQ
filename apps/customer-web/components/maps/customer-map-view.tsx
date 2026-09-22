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
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const MAP_STATS = [
  { value: "3", label: "Corridors" },
  { value: "12.4k", label: "Plays today" },
  { value: "84%", label: "Delivery" },
] as const

const BASEMAP_OPTIONS = BASEMAP_ORDER.map((id) => ({
  id,
  label: BASEMAP_PRESETS[id].label,
  description: BASEMAP_PRESETS[id].description,
}))

type CorridorStatus = "live" | "scheduled"

type CoverageCorridor = {
  id: string
  name: string
  screens: string
  reach: string
  status: CorridorStatus
}

const COVERAGE_CORRIDORS: CoverageCorridor[] = [
  {
    id: "1",
    name: "Nairobi CBD",
    screens: "18 screens",
    reach: "142k reach",
    status: "live",
  },
  {
    id: "2",
    name: "Westlands",
    screens: "12 screens",
    reach: "96k reach",
    status: "live",
  },
  {
    id: "3",
    name: "Mombasa Rd",
    screens: "6 screens",
    reach: "44k reach",
    status: "live",
  },
  {
    id: "4",
    name: "Karen",
    screens: "9 screens",
    reach: "—",
    status: "scheduled",
  },
]

const STATUS_LABEL: Record<CorridorStatus, string> = {
  live: "Live",
  scheduled: "Scheduled",
}

export function CustomerMapView() {
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const preset = BASEMAP_PRESETS[basemap]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Campaign map</h1>
          <p className="text-sm text-muted-foreground">
            Where your campaign is running across Nairobi's taxi-top corridors.
          </p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          Illustrative data — not yet live
        </p>
      </div>

      <div className="grid flex-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative h-[min(65vh,600px)] min-h-[440px] overflow-hidden rounded-xl border bg-muted/30 lg:h-auto">
          <Map
            key={basemap}
            loadingLabel="Loading campaign map"
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
                {MAP_STATS.map((stat) => (
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
            <h2 className="text-sm font-semibold">Coverage corridors</h2>
          </div>
          <div className="flex-1 divide-y overflow-y-auto lg:max-h-[520px]">
            {COVERAGE_CORRIDORS.map((corridor) => (
              <div
                key={corridor.id}
                className="flex items-start justify-between gap-3 px-4 py-3.5"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold">
                    {corridor.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {corridor.screens} · {corridor.reach}
                  </p>
                </div>
                <Badge
                  variant={corridor.status === "live" ? "default" : "outline"}
                  className={cn(
                    "shrink-0",
                    corridor.status === "scheduled" && "text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[corridor.status]}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
