/**
 * Demo fleet for the ops network map — every vehicle, screen, ad and number
 * here is made up. Nothing reads a live API: positions, the ad on each screen
 * and the play log are all pure functions of wall-clock time, so the marker,
 * its popup and the detail panel always agree with each other, and a reload
 * lands every vehicle where it "would" be.
 *
 * Route geometry (routes.json) is real Nairobi road centrelines, fetched once
 * from the public OSRM router and trimmed to the named road.
 */
import { MARKET_KEYS, marketAt, type MarketKey } from "@workspace/geo/markets"

import ROUTE_COORDS from "./routes.json"

export type LngLat = [number, number]
export type CorridorId = keyof typeof ROUTE_COORDS

export const CORRIDOR_NAMES: Record<CorridorId, string> = {
  thika: "Thika Rd",
  mombasa: "Mombasa Rd",
  ngong: "Ngong Rd",
  waiyaki: "Waiyaki Way",
  uhuru: "Uhuru Hwy",
  jogoo: "Jogoo Rd",
  langata: "Lang'ata Rd",
}

/** Seconds per ad slot — the supplier player's standard spot length. */
export const SLOT_SECONDS = 15
/** Vehicles drive at 3x their shown speed so motion reads at city zoom. */
const SIM_SPEEDUP = 3

// ---------------------------------------------------------------- geometry

const M_PER_DEG = 111_320
const COS_LAT = Math.cos((-1.29 * Math.PI) / 180)

function toMeters(a: LngLat, b: LngLat): [number, number] {
  return [(b[0] - a[0]) * M_PER_DEG * COS_LAT, (b[1] - a[1]) * M_PER_DEG]
}

type Route = { coords: LngLat[]; cum: number[]; length: number }

const ROUTES = Object.fromEntries(
  Object.entries(ROUTE_COORDS).map(([id, raw]) => {
    const coords = raw as LngLat[]
    const cum = [0]
    for (let i = 1; i < coords.length; i++) {
      cum.push(cum[i - 1]! + Math.hypot(...toMeters(coords[i - 1]!, coords[i]!)))
    }
    return [id, { coords, cum, length: cum[cum.length - 1]! }]
  }),
) as Record<CorridorId, Route>

export function routeCoords(id: CorridorId): LngLat[] {
  return ROUTES[id].coords
}

function pointAt(route: Route, d: number): LngLat {
  const dist = Math.min(Math.max(d, 0), route.length)
  let lo = 0
  let hi = route.cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (route.cum[mid]! <= dist) lo = mid
    else hi = mid
  }
  const a = route.coords[lo]!
  const b = route.coords[hi]!
  const span = route.cum[hi]! - route.cum[lo]!
  const f = span > 0 ? (dist - route.cum[lo]!) / span : 0
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

/** Degrees clockwise from north, a → b. */
function bearing(a: LngLat, b: LngLat): number {
  const [dx, dy] = toMeters(a, b)
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
}

// ------------------------------------------------------------------- zones

/** A campaign market (H3 cells, @workspace/geo/markets), or "network": road
 * outside every market, which plays the run-of-network rotation. */
export type ZoneId = MarketKey | "network"

export const ZONE_IDS: ZoneId[] = [...MARKET_KEYS, "network"]

export const zoneName = (z: ZoneId) => (z === "network" ? "Run of network" : z)

export function zoneAt(p: LngLat): { id: ZoneId; name: string } {
  const id = marketAt(p) ?? "network"
  return { id, name: zoneName(id) }
}

/** Rough reach per play, by zone — illustrative only, labelled as such. */
const VIEWS_PER_PLAY: Record<ZoneId, number> = {
  CBD: 70,
  Westlands: 55,
  Karen: 35,
  Kilimani: 40,
  "Mombasa Rd": 45,
  Eastlands: 50,
  network: 30,
}

// --------------------------------------------------------------------- ads

export type AdId =
  | "safari-cola"
  | "pesa-mint"
  | "nairobi-nights"
  | "soko-fresh"
  | "kahawa-house"
  | "mtaa-kicks"
  | "savanna-air"
  | "chakula-express"
  | "kasi-5g"
  | "fit254"
  | "tatu-heights"

export type DemoAd = {
  id: AdId
  brand: string
  tagline: string
  cta: string
  /** Brand colour: lit-screen glow on the marker + the creative's colour band */
  color: string
  /** Text colour on the band */
  ink: string
  src: string
  advertiser: string
  campaign: string
}

const AD_LIST: DemoAd[] = [
  {
    id: "safari-cola",
    brand: "Safari Cola",
    tagline: "Ice cold on every corner",
    cta: "From KES 60",
    color: "#c8202f",
    ink: "#fff7ef",
    src: "/demo-fleet/ads/safari-cola.mp4",
    advertiser: "Safari Beverages Ltd",
    campaign: "Hot season push",
  },
  {
    id: "pesa-mint",
    brand: "Pesa Mint",
    tagline: "Send to anyone. Zero fees under 500",
    cta: "Dial *483#",
    color: "#0f9d6b",
    ink: "#f2fff9",
    src: "/demo-fleet/ads/pesa-mint.mp4",
    advertiser: "Mint Mobile Money",
    campaign: "Zero-fee October",
  },
  {
    id: "nairobi-nights",
    brand: "Nairobi Nights",
    tagline: "Live at KICC grounds · Sat 25 Oct",
    cta: "Tickets KES 1,500",
    color: "#7a2fb8",
    ink: "#fbf5ff",
    src: "/demo-fleet/ads/nairobi-nights.mp4",
    advertiser: "Kilele Live Events",
    campaign: "Nairobi Nights 2026",
  },
  {
    id: "soko-fresh",
    brand: "Soko Fresh",
    tagline: "Farm to your door in 3 hours",
    cta: "Order on the app",
    color: "#e8a317",
    ink: "#2a1b02",
    src: "/demo-fleet/ads/soko-fresh.mp4",
    advertiser: "Soko Fresh Groceries",
    campaign: "Weekend basket",
  },
  {
    id: "kahawa-house",
    brand: "Kahawa House",
    tagline: "Kenyan AA, poured right",
    cta: "2nd cup free before 9am",
    color: "#7b4a2a",
    ink: "#fff4ea",
    src: "/demo-fleet/ads/kahawa-house.mp4",
    advertiser: "Kahawa House Cafés",
    campaign: "Morning commute",
  },
  {
    id: "mtaa-kicks",
    brand: "Mtaa Kicks",
    tagline: "New drops every Friday",
    cta: "Sarit Centre · Level 1",
    color: "#1f4fd1",
    ink: "#f3f6ff",
    src: "/demo-fleet/ads/mtaa-kicks.mp4",
    advertiser: "Mtaa Kicks",
    campaign: "Friday drops",
  },
  {
    id: "savanna-air",
    brand: "Savanna Air",
    tagline: "Nairobi to Mombasa in 55 minutes",
    cta: "From KES 4,999",
    color: "#0e86a8",
    ink: "#effbff",
    src: "/demo-fleet/ads/savanna-air.mp4",
    advertiser: "Savanna Airways",
    campaign: "Coast weekender",
  },
  {
    id: "chakula-express",
    brand: "Chakula Express",
    tagline: "Hot food at your gate in 30 minutes",
    cta: "Free delivery today",
    color: "#e4571b",
    ink: "#fff6f0",
    src: "/demo-fleet/ads/chakula-express.mp4",
    advertiser: "Chakula Express",
    campaign: "Free delivery Fridays",
  },
  {
    id: "kasi-5g",
    brand: "Kasi 5G",
    tagline: "The whole city, buffer-free",
    cta: "Home fibre from KES 2,999",
    color: "#d0246f",
    ink: "#fff3f8",
    src: "/demo-fleet/ads/kasi-5g.mp4",
    advertiser: "Kasi Telecom",
    campaign: "5G city launch",
  },
  {
    id: "fit254",
    brand: "Fit254",
    tagline: "Your first month is on us",
    cta: "Yaya Centre · Junction",
    color: "#4f7a12",
    ink: "#f6fbea",
    src: "/demo-fleet/ads/fit254.mp4",
    advertiser: "Fit254 Gyms",
    campaign: "New member drive",
  },
  {
    id: "tatu-heights",
    brand: "Tatu Heights",
    tagline: "2-bed homes off Thika Rd from KES 6.5M",
    cta: "Show flat open daily",
    color: "#1f2a3d",
    ink: "#eef3ff",
    src: "/demo-fleet/ads/tatu-heights.mp4",
    advertiser: "Tatu Homes Ltd",
    campaign: "Phase 2 launch",
  },
]

export const ADS = Object.fromEntries(AD_LIST.map((a) => [a.id, a])) as Record<
  AdId,
  DemoAd
>

/** Geotargeting: which campaigns are booked to play in each zone. */
const ZONE_ROTATION: Record<ZoneId, AdId[]> = {
  CBD: ["safari-cola", "kasi-5g", "pesa-mint", "savanna-air", "nairobi-nights", "kahawa-house", "mtaa-kicks"],
  Westlands: ["nairobi-nights", "fit254", "kahawa-house", "savanna-air", "mtaa-kicks", "chakula-express", "pesa-mint"],
  Karen: ["soko-fresh", "savanna-air", "kahawa-house", "fit254", "tatu-heights"],
  Kilimani: ["kahawa-house", "fit254", "soko-fresh", "chakula-express", "mtaa-kicks"],
  "Mombasa Rd": ["savanna-air", "safari-cola", "tatu-heights", "pesa-mint", "soko-fresh"],
  Eastlands: ["pesa-mint", "chakula-express", "safari-cola", "kasi-5g", "mtaa-kicks", "nairobi-nights"],
  // City-wide bookings, for screens between markets (Thika Rd, Kangemi…).
  network: ["pesa-mint", "safari-cola", "kasi-5g", "tatu-heights"],
}

export function zoneRotation(zone: ZoneId): DemoAd[] {
  return ZONE_ROTATION[zone].map((id) => ADS[id])
}

// ---------------------------------------------------------------- vehicles

export type VehicleStatus = "active" | "idle" | "offline"

export type DemoVehicle = {
  id: string
  plate: string
  kind: "taxi" | "bike"
  paint: "white" | "silver" | "graphite"
  /** Screen unit serial — TT = taxi-top, BX = bike box */
  serial: string
  status: VehicleStatus
  corridor: CorridorId
  speedKmh: number
  /** Where along the route (metres) the vehicle sits at t = 0 */
  startM: number
  /** Idle: parked this long. Offline: last heartbeat this long ago. */
  minutesAgo?: number
  driver: string
  partner: string
  firmware: string
  signal: 1 | 2 | 3 | 4
}

export const VEHICLES: DemoVehicle[] = [
  { id: "v01", plate: "KDH 482T", kind: "taxi", paint: "white", serial: "ADM-TT-0041", status: "active", corridor: "thika", speedKmh: 46, startM: 400, driver: "Peter Mwangi", partner: "Kilele Cabs", firmware: "2.4.1", signal: 4 },
  { id: "v02", plate: "KCZ 119M", kind: "taxi", paint: "silver", serial: "ADM-TT-0017", status: "active", corridor: "mombasa", speedKmh: 38, startM: 900, driver: "Grace Wanjiru", partner: "Kilele Cabs", firmware: "2.4.1", signal: 3 },
  { id: "v03", plate: "KDA 730A", kind: "taxi", paint: "white", serial: "ADM-TT-0052", status: "active", corridor: "waiyaki", speedKmh: 34, startM: 2200, driver: "Brian Otieno", partner: "Swift Rides KE", firmware: "2.4.1", signal: 4 },
  { id: "v04", plate: "KDE 215L", kind: "taxi", paint: "graphite", serial: "ADM-TT-0063", status: "active", corridor: "ngong", speedKmh: 29, startM: 1300, driver: "Faith Achieng", partner: "Swift Rides KE", firmware: "2.4.0", signal: 3 },
  { id: "v05", plate: "KCX 904P", kind: "taxi", paint: "white", serial: "ADM-TT-0008", status: "active", corridor: "uhuru", speedKmh: 41, startM: 600, driver: "Samuel Kiprono", partner: "Kilele Cabs", firmware: "2.4.1", signal: 4 },
  { id: "v06", plate: "KDG 377K", kind: "taxi", paint: "silver", serial: "ADM-TT-0071", status: "active", corridor: "jogoo", speedKmh: 27, startM: 1800, driver: "Mercy Njeri", partner: "Eastside Taxis", firmware: "2.3.9", signal: 2 },
  { id: "v07", plate: "KDJ 058R", kind: "taxi", paint: "white", serial: "ADM-TT-0085", status: "active", corridor: "langata", speedKmh: 44, startM: 3500, driver: "Kevin Odhiambo", partner: "Swift Rides KE", firmware: "2.4.1", signal: 4 },
  { id: "v08", plate: "KDH 913B", kind: "taxi", paint: "silver", serial: "ADM-TT-0090", status: "active", corridor: "thika", speedKmh: 52, startM: 5600, driver: "Joseph Mutua", partner: "Eastside Taxis", firmware: "2.4.1", signal: 3 },
  { id: "v09", plate: "KMFB 221Q", kind: "bike", paint: "white", serial: "ADM-BX-0107", status: "active", corridor: "waiyaki", speedKmh: 31, startM: 5200, driver: "Ann Wambui", partner: "Boda Express", firmware: "1.8.2", signal: 3 },
  { id: "v10", plate: "KMGA 640C", kind: "bike", paint: "white", serial: "ADM-BX-0112", status: "active", corridor: "uhuru", speedKmh: 24, startM: 2900, driver: "Dennis Kamau", partner: "Boda Express", firmware: "1.8.2", signal: 2 },
  { id: "v11", plate: "KDB 812H", kind: "taxi", paint: "white", serial: "ADM-TT-0033", status: "idle", corridor: "mombasa", speedKmh: 0, startM: 3800, minutesAgo: 14, driver: "Hassan Abdi", partner: "Kilele Cabs", firmware: "2.4.1", signal: 4 },
  { id: "v12", plate: "KMEZ 093D", kind: "bike", paint: "white", serial: "ADM-BX-0098", status: "idle", corridor: "ngong", speedKmh: 0, startM: 4100, minutesAgo: 6, driver: "Esther Chebet", partner: "Boda Express", firmware: "1.8.1", signal: 3 },
  { id: "v13", plate: "KCY 461F", kind: "taxi", paint: "silver", serial: "ADM-TT-0026", status: "offline", corridor: "jogoo", speedKmh: 0, startM: 600, minutesAgo: 4, driver: "John Kariuki", partner: "Eastside Taxis", firmware: "2.3.9", signal: 1 },
]

// ---------------------------------------------------------- the simulation

/** Last moment this vehicle was driving and reporting. */
export function liveUntil(v: DemoVehicle, t: number): number {
  return v.status === "active" ? t : t - (v.minutesAgo ?? 0) * 60
}

/** Route distance at time t, ping-ponging end to end. */
function distanceAt(v: DemoVehicle, t: number): { along: number; forward: boolean } {
  const route = ROUTES[v.corridor]
  const travelled =
    v.startM + (v.status === "active" ? (t * v.speedKmh * SIM_SPEEDUP) / 3.6 : 0)
  const lap = 2 * route.length
  const s = ((travelled % lap) + lap) % lap
  return s <= route.length
    ? { along: s, forward: true }
    : { along: lap - s, forward: false }
}

export type VehiclePose = { position: LngLat; heading: number }

export function poseAt(v: DemoVehicle, t: number): VehiclePose {
  const route = ROUTES[v.corridor]
  const { along, forward } = distanceAt(v, t)
  // Heading across a 30 m window so corners turn smoothly instead of
  // snapping at each polyline vertex.
  const a = pointAt(route, along - 15)
  const b = pointAt(route, along + 15)
  const h = bearing(a, b)
  return { position: pointAt(route, along), heading: forward ? h : (h + 180) % 360 }
}

export type Play = {
  ad: DemoAd
  zone: { id: ZoneId; name: string }
  start: number
  end: number
}

/** The ad on screen at time t. The zone is fixed at slot start, so crossing
 * a zone boundary never cuts a spot off mid-play. */
export function playAt(v: DemoVehicle, t: number): Play {
  const vIndex = VEHICLES.indexOf(v)
  const slot = Math.floor(t / SLOT_SECONDS)
  const start = slot * SLOT_SECONDS
  const zone = zoneAt(poseAt(v, start).position)
  const rotation = ZONE_ROTATION[zone.id]
  const ad = ADS[rotation[(slot + vIndex) % rotation.length]!]
  return { ad, zone, start, end: start + SLOT_SECONDS }
}

/** Most recent plays first, ending at the vehicle's last live moment. */
export function playLog(v: DemoVehicle, t: number, count: number): Play[] {
  const until = liveUntil(v, t)
  return Array.from({ length: count }, (_, i) =>
    playAt(v, until - (i + (v.status === "active" ? 1 : 0)) * SLOT_SECONDS),
  )
}

/** Shown speed wobbles a little around the cruise speed. */
export function speedAt(v: DemoVehicle, t: number): number {
  if (v.status !== "active") return 0
  return Math.max(0, Math.round(v.speedKmh + 5 * Math.sin(t / 9 + v.startM)))
}

/** Panel heat climbs through the Nairobi afternoon. */
export function panelTempAt(v: DemoVehicle, t: number): number {
  if (v.status === "offline") return 0
  const hour = (t / 3600 + 3) % 24 // EAT = UTC+3
  const sun = Math.max(0, Math.sin(((hour - 7) / 12) * Math.PI))
  return Math.round(31 + 12 * sun + 1.5 * Math.sin(t / 40 + v.startM))
}

/** Auto-brightness: full in daylight, dimmed after dark. */
export function brightnessAt(t: number): number {
  const hour = (t / 3600 + 3) % 24
  return hour >= 7 && hour < 18 ? 100 : hour >= 18 && hour < 22 ? 70 : 45
}

export function fleetCounts() {
  const count = (s: VehicleStatus) => VEHICLES.filter((v) => v.status === s).length
  return { active: count("active"), idle: count("idle"), offline: count("offline") }
}

export function corridorCounts(): { id: CorridorId; name: string; vehicles: number }[] {
  const ids = Object.keys(CORRIDOR_NAMES) as CorridorId[]
  return ids
    .map((id) => ({
      id,
      name: CORRIDOR_NAMES[id],
      vehicles: VEHICLES.filter((v) => v.corridor === id && v.status === "active").length,
    }))
    .filter((c) => c.vehicles > 0)
    .sort((a, b) => b.vehicles - a.vehicles)
}

// --------------------------------------------------------------- campaigns

/** Zones a campaign is booked into. */
export function targetZones(ad: AdId): ZoneId[] {
  return ZONE_IDS.filter((z) => ZONE_ROTATION[z].includes(ad))
}

const EAT_OFFSET = 3 * 3600
/** Screens switch on at 06:00 Nairobi time. */
function opsDayStart(t: number): number {
  return Math.floor((t + EAT_OFFSET) / 86_400) * 86_400 - EAT_OFFSET + 6 * 3600
}

export type CampaignTally = { plays: number; views: number }

/** Every spot played across the fleet since 06:00 today, per campaign.
 * ~2k slots per vehicle by evening — recompute at most once a minute. */
export function tallyToday(t: number): Record<AdId, CampaignTally> {
  const tally = Object.fromEntries(
    AD_LIST.map((a) => [a.id, { plays: 0, views: 0 }]),
  ) as Record<AdId, CampaignTally>
  const from = opsDayStart(t)
  for (const v of VEHICLES) {
    const until = liveUntil(v, t)
    for (let s = from; s + SLOT_SECONDS <= until; s += SLOT_SECONDS) {
      const p = playAt(v, s)
      tally[p.ad.id].plays += 1
      tally[p.ad.id].views += VIEWS_PER_PLAY[p.zone.id]
    }
  }
  return tally
}

/** Vehicles whose screen is showing this campaign at time t. */
export function screensShowing(ad: AdId, t: number): DemoVehicle[] {
  return VEHICLES.filter((v) => v.status === "active" && playAt(v, t).ad.id === ad)
}

/** Soonest upcoming spot for a campaign (looks ~2 minutes ahead). */
export function nextAiring(ad: AdId, t: number): { vehicle: DemoVehicle; at: number } | null {
  const first = Math.floor(t / SLOT_SECONDS) * SLOT_SECONDS + SLOT_SECONDS
  for (let s = first; s < first + 8 * SLOT_SECONDS; s += SLOT_SECONDS) {
    const v = VEHICLES.find((x) => x.status === "active" && playAt(x, s).ad.id === ad)
    if (v) return { vehicle: v, at: s }
  }
  return null
}

// ------------------------------------------------------------------ alerts

const LATEST_FIRMWARE = { taxi: "2.4.1", bike: "1.8.2" } as const
const HOT_PANEL_C = 42

export type FleetAlert = {
  vehicle: DemoVehicle
  kind: "offline" | "heat" | "signal" | "firmware"
  title: string
  detail: string
}

/** Most urgent first: dark screens lose paid plays, the rest are warnings. */
export function alertsAt(t: number): FleetAlert[] {
  const alerts: FleetAlert[] = []
  for (const v of VEHICLES) {
    if (v.status === "offline") {
      alerts.push({ vehicle: v, kind: "offline", title: "Screen offline", detail: `No heartbeat for ${v.minutesAgo} min` })
      continue
    }
    const temp = panelTempAt(v, t)
    if (temp >= HOT_PANEL_C) {
      alerts.push({ vehicle: v, kind: "heat", title: "Panel running hot", detail: `${temp}°C, dimming to protect LEDs` })
    }
    if (v.status === "active" && v.signal <= 2) {
      alerts.push({ vehicle: v, kind: "signal", title: "Weak signal", detail: `${v.signal} of 4 bars, proof-of-play may lag` })
    }
    const latest = LATEST_FIRMWARE[v.kind]
    if (v.firmware !== latest) {
      alerts.push({ vehicle: v, kind: "firmware", title: "Firmware behind", detail: `${v.firmware} → ${latest}` })
    }
  }
  const rank = { offline: 0, heat: 1, signal: 2, firmware: 3 }
  return alerts.sort((a, b) => rank[a.kind] - rank[b.kind])
}

// -------------------------------------------------------------- deep links

export const plateSlug = (v: DemoVehicle) => v.plate.replace(" ", "-")

export function vehicleBySlug(slug: string): DemoVehicle | undefined {
  return VEHICLES.find((v) => plateSlug(v).toLowerCase() === slug.toLowerCase())
}
