import type { FeatureCollection, Point, Polygon } from "geojson"

/** MapLibre / GeoJSON position: [longitude, latitude] */
export type LngLat = [number, number]

export type Corridor = {
  id: string
  name: string
  color: string
  /** Line string as [lng, lat] pairs */
  coordinates: LngLat[]
}

export type CityAnchor = {
  id: string
  name: string
  role: string
  longitude: number
  latitude: number
}

export type PlayPointProperties = {
  id: string
  corridorId: string
  label: string
}

export type CoverageProperties = {
  id: string
  name: string
  kind: "cbd" | "estate" | "arterial"
}

export type PlayPointsCollection = FeatureCollection<Point, PlayPointProperties>
export type CoverageCollection = FeatureCollection<Polygon, CoverageProperties>
