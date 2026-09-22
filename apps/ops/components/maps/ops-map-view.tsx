"use client"

import { useState } from "react"
import { Radio } from "lucide-react"

import { PageHero } from "@/components/ui/page-hero"
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

const BASEMAP_OPTIONS = BASEMAP_ORDER.map((id) => ({
  id,
  label: BASEMAP_PRESETS[id].label,
  description: BASEMAP_PRESETS[id].description,
}))

const FLEET_STATUS = [
  { value: "24", label: "Active", dot: "bg-primary" },
  { value: "7", label: "Idle", dot: "bg-primary/45" },
  { value: "5", label: "Offline", dot: "bg-muted-foreground/40" },
] as const

type CorridorDensity = {
  id: string
  name: string
  drivers: number
}

const TOP_CORRIDORS: CorridorDensity[] = [
  { id: "1", name: "Nairobi CBD", drivers: 11 },
  { id: "2", name: "Westlands", drivers: 8 },
  { id: "3", name: "Mombasa Rd", drivers: 6 },
  { id: "4", name: "Karen", drivers: 4 },
]

const maxDrivers = Math.max(...TOP_CORRIDORS.map((c) => c.drivers))

export function OpsMapView() {
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const preset = BASEMAP_PRESETS[basemap]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="Network map"
        description="Explore Nairobi on Clean, Streets, or 3D basemaps."
      />

      <div className="grid flex-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative h-[min(65vh,600px)] min-h-[440px] overflow-hidden rounded-xl border bg-muted/20 shadow-none lg:h-auto">
          <Map
            key={basemap}
            loadingLabel="Loading network map"
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
              showCompass
              showLocate
              showFullscreen
              position="bottom-right"
            />

            <div className="pointer-events-none absolute top-3 left-3 z-10">
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
                <Radio className="size-3" aria-hidden />
                Live GPS overlays connecting soon
              </div>
            </div>
          </Map>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Fleet status</h2>
          </div>

          <div className="grid grid-cols-3 divide-x border-b">
            {FLEET_STATUS.map((stat) => (
              <div key={stat.label} className="px-3 py-3 text-center">
                <p className="text-lg font-semibold leading-none">
                  {stat.value}
                </p>
                <div className="mt-1.5 flex items-center justify-center gap-1.5">
                  <span
                    className={cn("size-1.5 rounded-full", stat.dot)}
                    aria-hidden
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 space-y-3 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Top corridors by driver density
            </p>
            <div className="space-y-2.5">
              {TOP_CORRIDORS.map((corridor) => (
                <div key={corridor.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {corridor.name}
                    </p>
                    <p className="shrink-0 text-xs font-medium text-muted-foreground">
                      {corridor.drivers} drivers
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(corridor.drivers / maxDrivers) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
