/**
 * Shared basemap presets + overlay tokens for web and mobile maps.
 * Basemaps are free MapLibre style JSON (no API key).
 */

export type BasemapId = "clean" | "osm" | "streets3d"

export type BasemapPreset = {
  id: BasemapId
  label: string
  description: string
  light: string
  dark: string
  pitch: number
  buildings: boolean
  /** Glyph fonts that exist on that style's fontstack */
  textFont: string[]
}

export const BASEMAP_PRESETS: Record<BasemapId, BasemapPreset> = {
  clean: {
    id: "clean",
    label: "Clean",
    description: "Minimal Carto basemap",
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    pitch: 0,
    buildings: false,
    textFont: ["Open Sans Semibold", "Open Sans Regular"],
  },
  osm: {
    id: "osm",
    label: "Streets",
    description: "OpenStreetMap via OpenFreeMap",
    light: "https://tiles.openfreemap.org/styles/liberty",
    dark: "https://tiles.openfreemap.org/styles/dark",
    pitch: 0,
    buildings: false,
    textFont: ["Noto Sans Bold", "Noto Sans Regular"],
  },
  streets3d: {
    id: "streets3d",
    label: "3D",
    description: "Streets with pitched 3D buildings",
    light: "https://tiles.openfreemap.org/styles/liberty",
    dark: "https://tiles.openfreemap.org/styles/dark",
    pitch: 52,
    buildings: true,
    textFont: ["Noto Sans Bold", "Noto Sans Regular"],
  },
}

export const DEFAULT_BASEMAP: BasemapId = "clean"

export const BASEMAP_ORDER: BasemapId[] = ["clean", "osm", "streets3d"]

/** Brand-aligned overlay palette for units, plays, coverage, corridors */
export const MAP_OVERLAY = {
  unit: {
    point: "#0B6E4F",
    clusters: ["#0B6E4F", "#C2783E", "#9B4525"] as [string, string, string],
    thresholds: [8, 20] as [number, number],
  },
  play: {
    point: "#0B6E4F",
    clusters: ["#0B6E4F", "#C2783E", "#9B4525"] as [string, string, string],
    thresholds: [5, 15] as [number, number],
  },
  coverage: {
    cbd: "#0B6E4F",
    estate: "#9B4525",
    arterial: "#3D5A80",
    fallback: "#6B7280",
    outline: "#0B6E4F",
    fillOpacity: 0.2,
    lineOpacity: 0.5,
    lineWidth: 1.25,
  },
  route: {
    width: 4,
    casingWidth: 8,
    opacity: 0.95,
    casingOpacity: 0.28,
  },
} as const

export function resolveBasemapStyleUrl(
  basemap: BasemapId,
  dark: boolean,
): string {
  const preset = BASEMAP_PRESETS[basemap]
  return dark ? preset.dark : preset.light
}

export function coverageFillExpression(): [
  "match",
  ["get", "kind"],
  "cbd",
  string,
  "estate",
  string,
  "arterial",
  string,
  string,
] {
  const { cbd, estate, arterial, fallback } = MAP_OVERLAY.coverage
  return [
    "match",
    ["get", "kind"],
    "cbd",
    cbd,
    "estate",
    estate,
    "arterial",
    arterial,
    fallback,
  ]
}
