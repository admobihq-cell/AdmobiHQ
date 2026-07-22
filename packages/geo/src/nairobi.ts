import type {
  CityAnchor,
  Corridor,
  CoverageCollection,
  LngLat,
  PlayPointsCollection,
} from "./types"

/** Nairobi CBD — MapLibre center [lng, lat] */
export const NAIROBI_CENTER: LngLat = [36.8172, -1.2864]

export const NAIROBI_DEFAULT_ZOOM = 11.2

/**
 * Approximate commute corridors used in product copy.
 * Coordinates are simplified for demo maps (not survey-grade).
 */
export const NAIROBI_CORRIDORS: Corridor[] = [
  {
    id: "mombasa-rd",
    name: "Mombasa Road",
    color: "#0B6E4F",
    coordinates: [
      [36.8219, -1.2921],
      [36.835, -1.31],
      [36.855, -1.325],
      [36.88, -1.34],
      [36.91, -1.355],
    ],
  },
  {
    id: "waiyaki-way",
    name: "Waiyaki Way",
    color: "#9B4525",
    coordinates: [
      [36.8172, -1.2864],
      [36.79, -1.27],
      [36.76, -1.26],
      [36.73, -1.255],
      [36.7, -1.25],
    ],
  },
  {
    id: "thika-rd",
    name: "Thika Road",
    color: "#3D5A80",
    coordinates: [
      [36.828, -1.28],
      [36.845, -1.25],
      [36.87, -1.22],
      [36.9, -1.19],
      [36.93, -1.16],
    ],
  },
  {
    id: "langata-rd",
    name: "Langata Road",
    color: "#5B4B8A",
    coordinates: [
      [36.8172, -1.292],
      [36.8, -1.31],
      [36.78, -1.33],
      [36.76, -1.345],
      [36.74, -1.36],
    ],
  },
]

/** Subset shown as “booked” on the customer map */
export const CUSTOMER_BOOKED_CORRIDOR_IDS = ["mombasa-rd", "thika-rd"] as const

export function getCustomerBookedCorridors(): Corridor[] {
  return NAIROBI_CORRIDORS.filter((c) =>
    (CUSTOMER_BOOKED_CORRIDOR_IDS as readonly string[]).includes(c.id)
  )
}

export const CITY_ANCHORS: CityAnchor[] = [
  {
    id: "nairobi",
    name: "Nairobi",
    role: "Primary market · HQ corridors",
    longitude: 36.8172,
    latitude: -1.2864,
  },
  {
    id: "mombasa",
    name: "Mombasa",
    role: "Coastal expansion",
    longitude: 39.6682,
    latitude: -4.0435,
  },
  {
    id: "kisumu",
    name: "Kisumu",
    role: "Western expansion",
    longitude: 34.7617,
    latitude: -0.0917,
  },
]

/** Soft coverage polygons for CBD + estate bands */
export const COVERAGE_ZONES: CoverageCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "cbd",
      properties: { id: "cbd", name: "CBD core", kind: "cbd" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [36.805, -1.275],
            [36.835, -1.275],
            [36.835, -1.305],
            [36.805, -1.305],
            [36.805, -1.275],
          ],
        ],
      },
    },
    {
      type: "Feature",
      id: "westlands-estates",
      properties: {
        id: "westlands-estates",
        name: "Westlands / estate band",
        kind: "estate",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [36.78, -1.255],
            [36.81, -1.255],
            [36.81, -1.28],
            [36.78, -1.28],
            [36.78, -1.255],
          ],
        ],
      },
    },
    {
      type: "Feature",
      id: "airport-strip",
      properties: {
        id: "airport-strip",
        name: "Airport / Mombasa Rd strip",
        kind: "arterial",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [36.84, -1.31],
            [36.9, -1.31],
            [36.9, -1.35],
            [36.84, -1.35],
            [36.84, -1.31],
          ],
        ],
      },
    },
  ],
}

function pointAlong(coords: LngLat[], t: number): LngLat {
  if (coords.length === 0) return NAIROBI_CENTER
  if (coords.length === 1) return coords[0]!
  const max = coords.length - 1
  const scaled = Math.min(1, Math.max(0, t)) * max
  const i = Math.floor(scaled)
  const f = scaled - i
  const a = coords[Math.min(i, max)]!
  const b = coords[Math.min(i + 1, max)]!
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

function jitter(lngLat: LngLat, seed: number): LngLat {
  const dx = ((seed % 7) - 3) * 0.0012
  const dy = ((seed % 11) - 5) * 0.001
  return [lngLat[0] + dx, lngLat[1] + dy]
}

/** Demo proof-of-play / unit points along corridors */
export const PLAY_POINTS: PlayPointsCollection = {
  type: "FeatureCollection",
  features: NAIROBI_CORRIDORS.flatMap((corridor, cIdx) =>
    Array.from({ length: 8 }, (_, i) => {
      const [lng, lat] = jitter(
        pointAlong(corridor.coordinates, (i + 1) / 9),
        cIdx * 10 + i
      )
      return {
        type: "Feature" as const,
        id: `${corridor.id}-play-${i}`,
        properties: {
          id: `${corridor.id}-play-${i}`,
          corridorId: corridor.id,
          label: `Play · ${corridor.name}`,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [lng, lat],
        },
      }
    })
  ),
}

/** Customer map: plays only on booked corridors */
export function getCustomerPlayPoints(): PlayPointsCollection {
  const booked = new Set<string>(CUSTOMER_BOOKED_CORRIDOR_IDS)
  return {
    type: "FeatureCollection",
    features: PLAY_POINTS.features.filter((f) =>
      booked.has(f.properties.corridorId)
    ),
  }
}

/** Ops map: denser active-unit sample (all corridor plays) */
export const ACTIVE_UNIT_POINTS: PlayPointsCollection = PLAY_POINTS
