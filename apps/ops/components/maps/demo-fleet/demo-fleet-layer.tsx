"use client"

import { useEffect, useRef, useState } from "react"
import type { ExpressionSpecification } from "maplibre-gl"
import { Maximize2 } from "lucide-react"

import { BRAND_TERRA } from "@workspace/ui/brand/constants"
import { Button } from "@workspace/ui/components/button"
import {
  MapMarker,
  MapPopup,
  MapRoute,
  MarkerContent,
  useMap,
} from "@workspace/ui/components/map"
import { cn } from "@workspace/ui/lib/utils"

import { AdScreen } from "./ad-screen"
import { useSimNow } from "./clock"
import {
  ADS,
  VEHICLES,
  liveUntil,
  playAt,
  poseAt,
  routeCoords,
  speedAt,
  targetZones,
  zoneAt,
  type AdId,
  type DemoVehicle,
  type ZoneId,
} from "./fleet"
import {
  MARKET_CELLS,
  MARKET_KEYS,
  cellRing,
  marketCenter,
  marketOutline,
  type MarketKey,
} from "@workspace/geo/markets"
import { StatusPill, formatCountdown } from "./vehicle-details"

// Sprites are Blender renders (apps/ops/scripts/render-demo-vehicles.py) at
// 64 px per metre; `screen` is the roof unit's footprint in % of the sprite,
// where the lit-screen glow is painted.
const SPRITES = {
  taxi: { w: 166, h: 346, screen: { left: 46.15, top: 45.37, width: 7.69, height: 18.52 } },
  bike: { w: 96, h: 192, screen: { left: 29.3, top: 67.55, width: 41.4, height: 20.7 } },
} as const

/** Taxi length on screen at full scale; the bike keeps the same px/metre. */
const TAXI_PX = 60
const PX_PER_SPRITE_PX = TAXI_PX / SPRITES.taxi.h

/** DOM markers don't scale with the map, so shrink them toward city zoom. */
function scaleForZoom(zoom: number) {
  return Math.min(1, Math.max(0.45, 0.45 + (zoom - 11) * 0.14))
}

function spriteSrc(v: DemoVehicle) {
  return v.kind === "taxi" ? `/demo-fleet/vehicles/taxi-${v.paint}.png` : "/demo-fleet/vehicles/bike.png"
}

type DemoFleetLayerProps = {
  selectedId: string | null
  /** Campaign view: fade every vehicle not showing it, shade its zones */
  campaignId: AdId | null
  expanded: boolean
  following: boolean
  onSelect: (id: string | null) => void
  onExpand: (id: string) => void
  onStopFollowing: () => void
}

export function DemoFleetLayer({
  selectedId,
  campaignId,
  expanded,
  following,
  onSelect,
  onExpand,
  onStopFollowing,
}: DemoFleetLayerProps) {
  const { map } = useMap()
  const t = useSimNow()
  const [zoom, setZoom] = useState(11)
  const selected = VEHICLES.find((v) => v.id === selectedId) ?? null

  useEffect(() => {
    if (!map) return
    const onZoom = () => setZoom(map.getZoom())
    // A click on bare map clears the selection. Marker clicks bubble up to
    // the map container too, so only count clicks that landed on the canvas.
    const onClick = (e: { originalEvent: MouseEvent }) => {
      if (e.originalEvent.target === map.getCanvas()) onSelect(null)
    }
    const onDrag = () => onStopFollowing()
    onZoom()
    map.on("zoom", onZoom)
    map.on("click", onClick)
    map.on("dragstart", onDrag)
    return () => {
      map.off("zoom", onZoom)
      map.off("click", onClick)
      map.off("dragstart", onDrag)
    }
  }, [map, onSelect, onStopFollowing])

  // One camera move per selection change (two would cancel each other):
  // fly a selected vehicle into view if it's off-screen or tiny, and pad
  // for the detail rail so a followed vehicle centres in the visible map.
  useEffect(() => {
    if (!map) return
    const wide = window.matchMedia("(min-width: 768px)").matches
    const padding = { left: expanded && wide ? 340 : 0, top: 0, right: 0, bottom: 0 }
    const v = VEHICLES.find((x) => x.id === selectedId)
    const position = v ? poseAt(v, Date.now() / 1000).position : null
    if (position && (map.getZoom() < 13 || !map.getBounds().contains(position))) {
      map.flyTo({ center: position, zoom: Math.max(map.getZoom(), 14.5), padding, duration: 900 })
    } else {
      map.easeTo({ padding, duration: 500 })
    }
  }, [map, selectedId, expanded])

  // Campaign view: frame every zone the campaign is booked into.
  useEffect(() => {
    if (!map || !campaignId || expanded) return
    const zones = new Set<ZoneId>(targetZones(campaignId))
    const pts = MARKET_KEYS.filter((m) => zones.has(m)).flatMap((m) => MARKET_CELLS[m].flatMap(cellRing))
    if (pts.length === 0) return
    const lngs = pts.map((p) => p[0])
    const lats = pts.map((p) => p[1])
    const wide = window.matchMedia("(min-width: 768px)").matches
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: { left: wide ? 360 : 24, top: 40, right: 64, bottom: 40 }, maxZoom: 13.5, duration: 900 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on campaign change
  }, [map, campaignId])

  useEffect(() => {
    if (!map || !selected || !expanded || !following || map.isMoving()) return
    map.setCenter(poseAt(selected, t).position)
  }, [map, selected, expanded, following, t])

  const scale = scaleForZoom(zoom)
  const campaign = campaignId ? ADS[campaignId] : null

  return (
    <>
      <ZonesLayer t={t} zoom={zoom} campaignId={campaignId} />

      {selected ? (
        <MapRoute
          id="demo-fleet-route"
          coordinates={routeCoords(selected.corridor)}
          color={BRAND_TERRA}
          width={3}
          opacity={0.5}
          casing={false}
          interactive={false}
          dashArray={[1.5, 1.5]}
        />
      ) : null}

      {VEHICLES.map((v) => {
        const showing = campaign != null && v.status === "active" && playAt(v, t).ad.id === campaign.id
        return (
          <VehicleMarker
            key={v.id}
            vehicle={v}
            t={t}
            scale={scale}
            selected={v.id === selectedId}
            spotlight={showing ? campaign.color : null}
            dimmed={campaign != null && !showing && v.id !== selectedId}
            showLabel={zoom >= 14 || showing || v.status === "offline" || v.id === selectedId}
            onSelect={onSelect}
          />
        )
      })}

      {selected && !expanded ? (
        <MapPopup
          longitude={poseAt(selected, t).position[0]}
          latitude={poseAt(selected, t).position[1]}
          offset={TAXI_PX * scale * 0.55 + 6}
          closeOnClick={false}
          className="w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
        >
          <VehiclePopup vehicle={selected} t={t} onExpand={() => onExpand(selected.id)} />
        </MapPopup>
      ) : null}
    </>
  )
}

function VehicleMarker({
  vehicle: v,
  t,
  scale,
  selected,
  spotlight,
  dimmed,
  showLabel,
  onSelect,
}: {
  vehicle: DemoVehicle
  t: number
  scale: number
  selected: boolean
  /** Campaign view: this screen is showing the campaign — ring in its colour */
  spotlight: string | null
  dimmed: boolean
  showLabel: boolean
  onSelect: (id: string) => void
}) {
  const { position, heading } = poseAt(v, t)
  const sprite = SPRITES[v.kind]
  const k = PX_PER_SPRITE_PX * scale
  const w = sprite.w * k
  const h = sprite.h * k
  const play = v.status === "active" ? playAt(v, t) : null
  const ring = Math.max(h, 30) * 1.15
  const select = () => onSelect(v.id)

  return (
    <>
      <MapMarker
        longitude={position[0]}
        latitude={position[1]}
        rotation={heading}
        rotationAlignment="map"
        pitchAlignment="map"
        onClick={select}
      >
        <MarkerContent>
          <button
            type="button"
            aria-label={`${v.plate}, ${play ? `playing ${play.ad.brand}` : v.status}`}
            aria-pressed={selected}
            className={cn(
              "relative grid place-items-center rounded-full outline-none transition-opacity duration-500 focus-visible:ring-2 focus-visible:ring-ring",
              dimmed && "opacity-30 grayscale",
            )}
            style={{ width: Math.max(w, 28), height: Math.max(h, 28) }}
          >
            {selected ? (
              <span
                aria-hidden
                className="absolute rounded-full border-2 border-primary bg-primary/12 motion-safe:animate-pulse"
                style={{ width: ring, height: ring }}
              />
            ) : spotlight ? (
              <span
                aria-hidden
                className="absolute rounded-full border-2"
                style={{ width: ring, height: ring, borderColor: spotlight, backgroundColor: `${spotlight}1f` }}
              />
            ) : v.status === "offline" ? (
              <span
                aria-hidden
                className="absolute rounded-full border-[1.5px] border-dashed border-muted-foreground/70"
                style={{ width: ring, height: ring }}
              />
            ) : null}
            <span className="relative" style={{ width: w, height: h }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static sprite inside a MapLibre DOM marker */}
              <img
                src={spriteSrc(v)}
                alt=""
                width={w}
                height={h}
                draggable={false}
                className={cn(
                  "pointer-events-none size-full select-none",
                  v.status === "offline" && "opacity-50 grayscale",
                )}
              />
              {v.status !== "offline" ? (
                <span
                  aria-hidden
                  className="absolute rounded-[1px] transition-[background-color,box-shadow] duration-500"
                  style={{
                    left: `${sprite.screen.left}%`,
                    top: `${sprite.screen.top}%`,
                    width: `${sprite.screen.width}%`,
                    height: `${sprite.screen.height}%`,
                    backgroundColor: play ? play.ad.color : "#2b2f36",
                    boxShadow: play
                      ? `0 0 ${3 + 7 * scale}px ${1 + 2 * scale}px ${play.ad.color}`
                      : "none",
                  }}
                />
              ) : null}
            </span>
          </button>
        </MarkerContent>
      </MapMarker>

      {showLabel ? (
        <MapMarker
          longitude={position[0]}
          latitude={position[1]}
          offset={[0, Math.max(h, 28) / 2 + 12]}
          onClick={select}
        >
          <MarkerContent>
            <span className="flex items-center gap-1.5 rounded-md border bg-background/95 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap tabular-nums shadow-sm">
              <span
                aria-hidden
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: play ? play.ad.color : "#9aa0a8" }}
              />
              {v.plate}
              {v.status === "offline" ? (
                <span className="text-muted-foreground">· lost {v.minutesAgo}m ago</span>
              ) : null}
            </span>
          </MarkerContent>
        </MapMarker>
      ) : null}
    </>
  )
}

function VehiclePopup({
  vehicle: v,
  t,
  onExpand,
}: {
  vehicle: DemoVehicle
  t: number
  onExpand: () => void
}) {
  const offline = v.status === "offline"
  const play = v.status === "idle" ? null : playAt(v, liveUntil(v, t))
  const zone = zoneAt(poseAt(v, t).position)
  const progress = play && !offline ? ((t - play.start) / (play.end - play.start)) * 100 : 0

  return (
    <div>
      <div className={cn(v.kind === "bike" && "bg-[#07080a] py-2")}>
        <AdScreen
          ad={play?.ad ?? null}
          shape={v.kind}
          startedAt={play?.start ?? 0}
          frozen={offline}
          className={cn("rounded-none ring-0", v.kind === "bike" && "mx-auto w-36")}
        />
      </div>
      <div className="h-0.5 bg-muted">
        {play && !offline ? (
          <div className="h-full" style={{ width: `${progress}%`, backgroundColor: play.ad.color }} />
        ) : null}
      </div>
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {offline ? `Last played ${play?.ad.brand}` : (play?.ad.brand ?? "Standby")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {offline
                ? `Signal lost ${v.minutesAgo} min ago`
                : play
                  ? `${play.ad.campaign} · ${formatCountdown(play.end - t)} left`
                  : `Parked ${v.minutesAgo} min · no spot booked`}
            </p>
          </div>
          <StatusPill status={v.status} />
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <PopupField label="Vehicle" value={v.plate} />
          <PopupField label="Screen" value={v.serial} />
          <PopupField label="Zone" value={zone.name} />
          <PopupField label="Speed" value={offline ? "—" : `${speedAt(v, t)} km/h`} />
        </dl>
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={onExpand}>
          <Maximize2 className="size-3.5" aria-hidden />
          Open details
        </Button>
      </div>
    </div>
  )
}

function PopupField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium tabular-nums">{value}</dd>
    </div>
  )
}

const HEX_SOURCE = "demo-fleet-hexes"
const MARKET_SOURCE = "demo-fleet-markets"
const MARKET_INDEX = Object.fromEntries(MARKET_KEYS.map((m, i) => [m, i])) as Record<MarketKey, number>
const HEX_LINE = "#9B4525"

/** Paint expression: `on` for cells/outlines of the given markets, else `off`. */
function byMarket<T extends string | number>(markets: MarketKey[], on: T, off: T): T | ExpressionSpecification {
  return markets.length > 0 ? ["match", ["get", "market"], markets, on, off] : off
}

/** Campaign markets as H3 hexagons (res 8): faint hex texture always; the
 * campaign's markets shaded in its colour; a market pulses when a screen's
 * next spot is booked from it. Road between markets is run-of-network. */
function ZonesLayer({ t, zoom, campaignId }: { t: number; zoom: number; campaignId: AdId | null }) {
  const { map, isLoaded } = useMap()
  const lastZone = useRef<Record<string, ZoneId>>({})
  const campaign = campaignId ? ADS[campaignId] : null
  const targeted = new Set<ZoneId>(campaignId ? targetZones(campaignId) : [])

  useEffect(() => {
    if (!map || !isLoaded) return
    map.addSource(HEX_SOURCE, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: MARKET_KEYS.flatMap((market) =>
          MARKET_CELLS[market].map((cell) => ({
            type: "Feature" as const,
            properties: { market, cell },
            geometry: { type: "Polygon" as const, coordinates: [cellRing(cell)] },
          })),
        ),
      },
    })
    map.addSource(MARKET_SOURCE, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: MARKET_KEYS.map((market, i) => ({
          type: "Feature",
          id: i,
          properties: { market },
          geometry: { type: "MultiPolygon", coordinates: marketOutline(market) },
        })),
      },
    })
    map.addLayer({
      id: `${HEX_SOURCE}-fill`,
      type: "fill",
      source: HEX_SOURCE,
      paint: { "fill-color": HEX_LINE, "fill-opacity": 0.04 },
    })
    map.addLayer({
      id: `${HEX_SOURCE}-line`,
      type: "line",
      source: HEX_SOURCE,
      paint: { "line-color": HEX_LINE, "line-width": 0.6, "line-opacity": 0.22 },
    })
    map.addLayer({
      id: `${MARKET_SOURCE}-flash`,
      type: "fill",
      source: MARKET_SOURCE,
      paint: {
        "fill-color": HEX_LINE,
        "fill-opacity": ["case", ["boolean", ["feature-state", "flash"], false], 0.16, 0],
        "fill-opacity-transition": { duration: 700, delay: 0 },
      },
    })
    map.addLayer({
      id: `${MARKET_SOURCE}-line`,
      type: "line",
      source: MARKET_SOURCE,
      paint: { "line-color": HEX_LINE, "line-width": 1.4, "line-opacity": 0.55 },
    })
    return () => {
      try {
        for (const id of [`${MARKET_SOURCE}-line`, `${MARKET_SOURCE}-flash`, `${HEX_SOURCE}-line`, `${HEX_SOURCE}-fill`]) {
          map.removeLayer(id)
        }
        map.removeSource(MARKET_SOURCE)
        map.removeSource(HEX_SOURCE)
      } catch {
        // map already torn down
      }
    }
  }, [map, isLoaded])

  // Campaign shading: its markets' hexes and outlines take its colour.
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(`${HEX_SOURCE}-fill`)) return
    const markets = campaignId ? MARKET_KEYS.filter((m) => targetZones(campaignId).includes(m)) : []
    const color = campaignId ? ADS[campaignId].color : HEX_LINE
    map.setPaintProperty(`${HEX_SOURCE}-fill`, "fill-color", byMarket(markets, color, HEX_LINE))
    map.setPaintProperty(`${HEX_SOURCE}-fill`, "fill-opacity", byMarket(markets, 0.16, 0.04))
    map.setPaintProperty(`${HEX_SOURCE}-line`, "line-color", byMarket(markets, color, HEX_LINE))
    map.setPaintProperty(`${MARKET_SOURCE}-line`, "line-color", byMarket(markets, color, HEX_LINE))
    map.setPaintProperty(`${MARKET_SOURCE}-line`, "line-width", byMarket(markets, 2, 1.4))
  }, [map, isLoaded, campaignId])

  // A screen switching market (its next spot is booked from that market's
  // rotation) pulses that market once.
  useEffect(() => {
    if (!map || !isLoaded || !map.getSource(MARKET_SOURCE)) return
    for (const v of VEHICLES) {
      if (v.status !== "active") continue
      const zone = playAt(v, t).zone.id
      const prev = lastZone.current[v.id]
      lastZone.current[v.id] = zone
      if (!prev || prev === zone || zone === "network") continue
      const id = MARKET_INDEX[zone]
      map.setFeatureState({ source: MARKET_SOURCE, id }, { flash: true })
      window.setTimeout(() => {
        if (map.getSource(MARKET_SOURCE)) map.setFeatureState({ source: MARKET_SOURCE, id }, { flash: false })
      }, 1400)
    }
  }, [map, isLoaded, t])

  if (zoom >= 15.5) return null

  return MARKET_KEYS.map((m) => {
    const [lng, lat] = marketCenter(m)
    const on = targeted.has(m)
    return (
      <MapMarker key={m} longitude={lng} latitude={lat}>
        <MarkerContent className="pointer-events-none cursor-default">
          <span
            className={cn(
              "text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
              !on && "text-foreground/50",
            )}
            style={{
              color: on ? campaign?.color : undefined,
              textShadow: "0 0 3px var(--background), 0 0 3px var(--background)",
            }}
          >
            {m}
          </span>
        </MarkerContent>
      </MapMarker>
    )
  })
}
