"use client"

import { useMemo, useState } from "react"

import {
  COVERAGE_ZONES,
  NAIROBI_CENTER,
  NAIROBI_DEFAULT_ZOOM,
  getCustomerBookedCorridors,
  getCustomerPlayPoints,
} from "@workspace/geo"
import {
  Map,
  MapClusterLayer,
  MapControls,
  MapGeoJSON,
  MapRoute,
} from "@workspace/ui/components/map"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type LayerKey = "corridors" | "coverage" | "plays"

const LAYER_LABELS: Record<LayerKey, string> = {
  corridors: "Booked corridors",
  coverage: "Coverage zones",
  plays: "Proof-of-play",
}

export function CustomerMapView() {
  const corridors = useMemo(() => getCustomerBookedCorridors(), [])
  const plays = useMemo(() => getCustomerPlayPoints(), [])
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    corridors: true,
    coverage: true,
    plays: true,
  })

  function toggle(key: LayerKey) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Map</h1>
        <p className="text-sm text-muted-foreground">
          Campaign corridors, coverage, and GPS proof-of-play density across
          Nairobi. Demo data — live inventory will connect later.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={layers[key] ? "default" : "outline"}
            onClick={() => toggle(key)}
            className={cn(!layers[key] && "text-muted-foreground")}
          >
            {LAYER_LABELS[key]}
          </Button>
        ))}
      </div>

      <div className="relative min-h-[480px] flex-1 overflow-hidden rounded-xl border bg-muted/30">
        <Map
          center={NAIROBI_CENTER}
          zoom={NAIROBI_DEFAULT_ZOOM}
          className="absolute inset-0 h-full w-full"
        >
          <MapControls showZoom showFullscreen position="bottom-right" />

          {layers.coverage ? (
            <MapGeoJSON
              id="customer-coverage"
              data={COVERAGE_ZONES}
              promoteId="id"
              fillPaint={{
                "fill-color": [
                  "match",
                  ["get", "kind"],
                  "cbd",
                  "#0F766E",
                  "estate",
                  "#C2410C",
                  "arterial",
                  "#1D4ED8",
                  "#64748B",
                ],
                "fill-opacity": 0.22,
              }}
              linePaint={{
                "line-color": "#0F766E",
                "line-width": 1.5,
                "line-opacity": 0.55,
              }}
            />
          ) : null}

          {layers.corridors
            ? corridors.map((corridor) => (
                <MapRoute
                  key={corridor.id}
                  id={`customer-corridor-${corridor.id}`}
                  coordinates={corridor.coordinates}
                  color={corridor.color}
                  width={4}
                  opacity={0.9}
                />
              ))
            : null}

          {layers.plays ? (
            <MapClusterLayer
              data={plays}
              clusterColors={["#0F766E", "#C2410C", "#9A3412"]}
              clusterThresholds={[5, 15]}
              pointColor="#0F766E"
            />
          ) : null}
        </Map>
      </div>

      <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {corridors.map((c) => (
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
