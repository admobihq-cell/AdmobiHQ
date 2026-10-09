import { cellToBoundary, cellToLatLng, cellsToMultiPolygon, greatCircleDistance, gridDisk, latLngToCell } from "h3-js"

import type { LngLat } from "./types"

/**
 * The campaign markets as sets of H3 cells. Kept off the package root export
 * (subpath `@workspace/geo/markets` only) so the mobile apps never bundle
 * h3-js.
 *
 * Keys must stay identical to the wizard's MARKETS (customer-web
 * campaign-wizard.tsx) and `marketZoneIds` in ops-contracts pricing.ts.
 * Resolution 8 (~0.74 km² cells) matches the planned audience index, so
 * targeting, plays and foot traffic can all be reported per cell.
 *
 * Coverage is a hex disk around each anchor; where two disks overlap the
 * cell goes to the nearer anchor. Approximate neighbourhoods, not surveyed
 * boundaries — fine for maps and demos, refine per-cell when it matters.
 */
export const MARKET_H3_RES = 8

export const MARKET_KEYS = ["CBD", "Westlands", "Karen", "Kilimani", "Mombasa Rd", "Eastlands"] as const
export type MarketKey = (typeof MARKET_KEYS)[number]

const ANCHORS: Record<MarketKey, { center: LngLat; rings: number }> = {
  CBD: { center: [36.8219, -1.2864], rings: 2 },
  Westlands: { center: [36.805, -1.265], rings: 2 },
  Kilimani: { center: [36.785, -1.29], rings: 2 },
  // Karen's eastern edge along Lang'ata Rd, where the network's routes run.
  Karen: { center: [36.755, -1.33], rings: 3 },
  "Mombasa Rd": { center: [36.845, -1.318], rings: 3 },
  Eastlands: { center: [36.865, -1.29], rings: 3 },
}

const anchorCell = (m: MarketKey) =>
  latLngToCell(ANCHORS[m].center[1], ANCHORS[m].center[0], MARKET_H3_RES)

function distanceKm(cell: string, m: MarketKey): number {
  const [lat, lng] = cellToLatLng(cell)
  const [aLng, aLat] = ANCHORS[m].center
  return greatCircleDistance([lat, lng], [aLat, aLng], "km")
}

/** cell index → market. Disjoint: an overlapped cell goes to the nearer anchor. */
const CELL_MARKET = new Map<string, MarketKey>()
for (const m of MARKET_KEYS) {
  for (const cell of gridDisk(anchorCell(m), ANCHORS[m].rings)) {
    const owner = CELL_MARKET.get(cell)
    if (!owner || distanceKm(cell, m) < distanceKm(cell, owner)) CELL_MARKET.set(cell, m)
  }
}

export const MARKET_CELLS = Object.fromEntries(
  MARKET_KEYS.map((m) => [m, [...CELL_MARKET].filter(([, owner]) => owner === m).map(([cell]) => cell)]),
) as Record<MarketKey, string[]>

/** Which market a point falls in, or null outside every market. */
export function marketAt([lng, lat]: LngLat): MarketKey | null {
  return CELL_MARKET.get(latLngToCell(lat, lng, MARKET_H3_RES)) ?? null
}

export function marketCenter(m: MarketKey): LngLat {
  return ANCHORS[m].center
}

/** GeoJSON ring ([lng, lat], closed) of one cell. */
export function cellRing(cell: string): LngLat[] {
  return cellToBoundary(cell, true) as LngLat[]
}

/** A market's dissolved outline as GeoJSON MultiPolygon coordinates. */
export function marketOutline(m: MarketKey): LngLat[][][] {
  return cellsToMultiPolygon(MARKET_CELLS[m], true) as LngLat[][][]
}
