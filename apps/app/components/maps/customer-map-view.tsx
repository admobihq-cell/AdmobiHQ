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
import { Card, CardContent } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

type LayerKey = "corridors" | "coverage" | "plays"

const LAYER_LABELS: Record<LayerKey, string> = {
  corridors: "Corridors",
  coverage: "Coverage",
  plays: "Plays",
}

const MAP_STATS = [
  { value: "3", label: "Corridors" },
  { value: "12.4k", label: "Plays today" },
  { value: "84%", label: "Delivery" },
] as const

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
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Live coverage
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Campaign map</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Booked corridors, coverage zones, and proof-of-play across Nairobi.
            Demo data — live inventory will connect later.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
          <span className="size-2 rounded-full bg-primary" aria-hidden />
          Demo
        </div>
      </div>

      <Card className="shadow-none">
        <CardContent className="grid grid-cols-3 divide-x p-0">
          {MAP_STATS.map((stat) => (
            <div key={stat.label} className="px-4 py-3 text-center">
              <p className="text-base font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

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

      <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-xl border bg-muted/30">
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
