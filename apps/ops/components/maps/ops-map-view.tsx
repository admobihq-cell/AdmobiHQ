"use client"

import { useMemo, useState } from "react"

import { PageHero } from "@/components/ui/page-hero"
import {
  ACTIVE_UNIT_POINTS,
  CITY_ANCHORS,
  NAIROBI_CENTER,
  NAIROBI_CORRIDORS,
  NAIROBI_DEFAULT_ZOOM,
} from "@workspace/geo"
import {
  Map,
  MapClusterLayer,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
} from "@workspace/ui/components/map"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type LayerKey = "units" | "corridors" | "anchors"

const LAYER_LABELS: Record<LayerKey, string> = {
  units: "Active units",
  corridors: "Corridor network",
  anchors: "City anchors",
}

export function OpsMapView() {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    units: true,
    corridors: true,
    anchors: true,
  })
  const units = useMemo(() => ACTIVE_UNIT_POINTS, [])

  function toggle(key: LayerKey) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHero
        eyebrow="Network"
        title="Network map"
        description="Operational view of corridors, equipped units, and market anchors. Demo positions — live GPS will replace fixtures later."
      />

      <div className="flex flex-wrap gap-2">
        {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={layers[key] ? "default" : "outline"}
            onClick={() => toggle(key)}
            className={cn(
              "rounded-full",
              !layers[key] && "text-muted-foreground",
            )}
          >
            {LAYER_LABELS[key]}
          </Button>
        ))}
      </div>

      <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-xl border bg-muted/20 shadow-none">
        <Map
          center={NAIROBI_CENTER}
          zoom={NAIROBI_DEFAULT_ZOOM}
          className="absolute inset-0 h-full w-full"
        >
          <MapControls
            showZoom
            showCompass
            showLocate
            showFullscreen
            position="bottom-right"
          />

          {layers.corridors
            ? NAIROBI_CORRIDORS.map((corridor) => (
                <MapRoute
                  key={corridor.id}
                  id={`ops-corridor-${corridor.id}`}
                  coordinates={corridor.coordinates}
                  color={corridor.color}
                  width={3.5}
                  opacity={0.85}
                />
              ))
            : null}

          {layers.units ? (
            <MapClusterLayer
              data={units}
              clusterColors={["#1D4ED8", "#C2410C", "#9A3412"]}
              clusterThresholds={[8, 20]}
              pointColor="#1D4ED8"
            />
          ) : null}

          {layers.anchors
            ? CITY_ANCHORS.map((city) => (
                <MapMarker
                  key={city.id}
                  longitude={city.longitude}
                  latitude={city.latitude}
                >
                  <MarkerContent className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground shadow-md">
                    {city.name.slice(0, 1)}
                    <MarkerLabel position="top">{city.name}</MarkerLabel>
                  </MarkerContent>
                  <MarkerPopup closeButton>
                    <div className="space-y-1 p-1">
                      <p className="text-sm font-medium">{city.name}</p>
                      <p className="text-xs text-muted-foreground">{city.role}</p>
                    </div>
                  </MarkerPopup>
                </MapMarker>
              ))
            : null}
        </Map>
      </div>

      <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {NAIROBI_CORRIDORS.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: c.color }}
              aria-hidden
            />
            {c.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
