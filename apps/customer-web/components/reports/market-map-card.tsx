"use client"

import { useMemo } from "react"
import { NAIROBI_CENTER } from "@workspace/geo"
import { MARKET_KEYS, marketOutline } from "@workspace/geo/markets"
import type { NamedValue } from "@workspace/ops-contracts"

import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { Map, MapGeoJSON } from "@workspace/ui/components/map"
import { compactOrDash } from "@/components/reports/format"

// MapLibre paints cannot read CSS variables, so this is a mid-tone of the --chart-1 hue that
// holds up on both light and dark basemaps. Shade (opacity) carries the value; the list below
// the map prints every number, so colour is never the only encoding.
const HUE = "#c4622d"

/**
 * The six campaign markets shaded by estimated impressions, one hue. Loaded lazily and only on
 * the Audience tab (see audience-tab.tsx), since it pulls in MapLibre and the H3 cell sets.
 */
export default function MarketMapCard({ markets }: { markets: NamedValue[] }) {
  // Memoised so a filter change re-shades the polygons instead of remounting the map.
  const data = useMemo(() => {
    const values = new globalThis.Map(markets.map((m) => [m.name, m.value]))
    const max = Math.max(0, ...markets.map((m) => m.value))
    return {
      type: "FeatureCollection" as const,
      features: MARKET_KEYS.map((name) => {
        const value = values.get(name) ?? 0
        return {
          type: "Feature" as const,
          properties: { name, value, intensity: max > 0 ? 0.12 + (value / max) * 0.68 : 0.08 },
          geometry: { type: "MultiPolygon" as const, coordinates: marketOutline(name) },
        }
      }),
    }
  }, [markets])

  return (
    <DashboardCard title="Market map" description="Estimated impressions by market, darker is more">
      <div className="h-72 overflow-hidden rounded-md border" role="img" aria-label="Map of campaign markets shaded by estimated impressions">
        <Map blank center={NAIROBI_CENTER} zoom={10.4} className="h-full w-full">
          <MapGeoJSON
            data={data}
            fillPaint={{ "fill-color": HUE, "fill-opacity": ["get", "intensity"] }}
            linePaint={{ "line-color": HUE, "line-width": 1.5, "line-opacity": 0.8 }}
          />
        </Map>
      </div>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {MARKET_KEYS.map((name) => (
          <li key={name} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{name}</span>
            <span className="tabular-nums">
              {compactOrDash(markets.find((m) => m.name === name)?.value ?? null)}
            </span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  )
}
