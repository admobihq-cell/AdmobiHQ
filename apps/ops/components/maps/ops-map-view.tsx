"use client"

import { useState } from "react"

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

const BASEMAP_OPTIONS = BASEMAP_ORDER.map((id) => ({
  id,
  label: BASEMAP_PRESETS[id].label,
  description: BASEMAP_PRESETS[id].description,
}))

export function OpsMapView() {
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const preset = BASEMAP_PRESETS[basemap]

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHero
        eyebrow="Network"
        title="Network map"
        description="Explore Nairobi on Clean, Streets, or 3D basemaps. Live GPS overlays will connect later."
      />

      <div className="relative h-[min(70vh,640px)] min-h-[480px] flex-1 overflow-hidden rounded-xl border bg-muted/20 shadow-none">
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
            showCompass
            showLocate
            showFullscreen
            position="bottom-right"
          />
        </Map>
      </div>
    </div>
  )
}
