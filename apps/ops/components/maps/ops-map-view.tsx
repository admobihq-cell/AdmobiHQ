"use client"

import { useCallback, useEffect, useState } from "react"
import { CircleArrowUp, RadioTower, Thermometer, WifiOff } from "lucide-react"

import { MapCanvas } from "@workspace/ui/components/map-canvas"
import { cn } from "@workspace/ui/lib/utils"

import { CampaignDetails, CampaignList } from "./demo-fleet/campaign-panel"
import { useSimNow } from "./demo-fleet/clock"
import { DemoFleetLayer } from "./demo-fleet/demo-fleet-layer"
import {
  ADS,
  VEHICLES,
  alertsAt,
  corridorCounts,
  fleetCounts,
  liveUntil,
  plateSlug,
  playAt,
  poseAt,
  vehicleBySlug,
  zoneAt,
  type AdId,
  type FleetAlert,
} from "./demo-fleet/fleet"
import { VehicleDetails } from "./demo-fleet/vehicle-details"

const counts = fleetCounts()
const FLEET_STATUS = [
  { value: String(counts.active), label: "Active", dot: "bg-primary" },
  { value: String(counts.idle), label: "Idle", dot: "bg-primary/45" },
  { value: String(counts.offline), label: "Offline", dot: "bg-muted-foreground/40" },
]

const TOP_CORRIDORS = corridorCounts()
const maxVehicles = Math.max(...TOP_CORRIDORS.map((c) => c.vehicles))

type RailTab = "vehicles" | "campaigns"

export function OpsMapView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [following, setFollowing] = useState(true)
  const [campaignId, setCampaignId] = useState<AdId | null>(null)
  const [tab, setTab] = useState<RailTab>("vehicles")
  const selected = VEHICLES.find((v) => v.id === selectedId) ?? null

  const select = useCallback((id: string | null) => {
    setSelectedId(id)
    setExpanded(false)
  }, [])
  const expand = useCallback((id: string) => {
    setSelectedId(id)
    setExpanded(true)
    setFollowing(true)
  }, [])
  const stopFollowing = useCallback(() => setFollowing(false), [])
  const pickCampaign = (id: AdId | null) => {
    setCampaignId(id)
    setSelectedId(null)
    setExpanded(false)
  }

  // Deep links: /map?vehicle=KDH-482T opens that vehicle, ?campaign=<id> a
  // campaign. Read once on mount (client-only, so no hydration mismatch)…
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const campaign = q.get("campaign")
    const vehicle = q.get("vehicle")
    /* eslint-disable react-hooks/set-state-in-effect -- one-time URL hydration */
    if (campaign && campaign in ADS) {
      setCampaignId(campaign as AdId)
      setTab("campaigns")
    }
    const v = vehicle ? vehicleBySlug(vehicle) : undefined
    if (v) {
      setSelectedId(v.id)
      setExpanded(true)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // …and kept in sync as the view changes, so the address bar is always shareable.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    q.delete("vehicle")
    q.delete("campaign")
    if (expanded && selected) q.set("vehicle", plateSlug(selected))
    if (campaignId) q.set("campaign", campaignId)
    const qs = q.toString()
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`)
  }, [expanded, selected, campaignId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (expanded) setExpanded(false)
      else if (selectedId) setSelectedId(null)
      else setCampaignId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expanded, selectedId])

  const showDetails = expanded && selected
  const campaign = campaignId ? ADS[campaignId] : null

  let title = "Network map"
  let description = "Where the fleet is and what every screen is playing."
  if (showDetails) {
    title = selected.plate
    description = `${selected.kind === "taxi" ? "Taxi-top" : "Delivery bike"} · ${selected.serial} · ${selected.partner}`
  } else if (campaign) {
    title = campaign.brand
    description = "Where this campaign is playing right now."
  }

  return (
    <MapCanvas
      title={title}
      description={description}
      summary={showDetails || campaign ? undefined : FLEET_STATUS}
      note="Demo data: simulated vehicles, positions and ads"
      loadingLabel="Loading network map"
      controls={{ showLocate: true, showFullscreen: true }}
      overlay={
        <DemoFleetLayer
          selectedId={selectedId}
          campaignId={campaignId}
          expanded={expanded}
          following={following}
          onSelect={select}
          onExpand={expand}
          onStopFollowing={stopFollowing}
        />
      }
    >
      {showDetails ? (
        <VehicleDetails
          key={selected.id}
          vehicle={selected}
          following={following}
          onFollow={() => setFollowing((f) => !f)}
          onBack={() => select(null)}
          backLabel={campaign ? `Back to ${campaign.brand}` : "All vehicles"}
        />
      ) : campaign ? (
        <CampaignDetails
          key={campaign.id}
          adId={campaign.id}
          onBack={() => pickCampaign(null)}
          onPickVehicle={expand}
        />
      ) : (
        <>
          <RailTabs tab={tab} onChange={setTab} />
          {tab === "vehicles" ? (
            <FleetOverview selectedId={selectedId} onSelect={select} onExpand={expand} />
          ) : (
            <CampaignList onPick={pickCampaign} />
          )}
        </>
      )}
    </MapCanvas>
  )
}

function RailTabs({ tab, onChange }: { tab: RailTab; onChange: (t: RailTab) => void }) {
  return (
    <div className="px-4 py-2.5">
      <div role="tablist" aria-label="Rail view" className="grid grid-cols-2 rounded-lg bg-muted p-0.5 text-xs font-medium">
        {(["vehicles", "campaigns"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => onChange(t)}
            className={cn(
              "rounded-md py-1.5 capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

const ALERT_ICON = {
  offline: WifiOff,
  heat: Thermometer,
  signal: RadioTower,
  firmware: CircleArrowUp,
} satisfies Record<FleetAlert["kind"], unknown>

function FleetOverview({
  selectedId,
  onSelect,
  onExpand,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  onExpand: (id: string) => void
}) {
  const t = useSimNow(1)
  const alerts = alertsAt(t)

  return (
    <>
      {alerts.length > 0 ? (
        <div className="py-2">
          <h2 className="flex items-baseline justify-between px-4 pt-1.5 pb-1 text-xs font-semibold">
            Needs attention
            <span className="font-medium text-muted-foreground tabular-nums">{alerts.length}</span>
          </h2>
          <ul>
            {alerts.map((a) => {
              const Icon = ALERT_ICON[a.kind]
              return (
                <li key={`${a.vehicle.id}-${a.kind}`}>
                  <button
                    type="button"
                    onClick={() => onExpand(a.vehicle.id)}
                    className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <Icon
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        a.kind === "offline" || a.kind === "heat" ? "text-destructive" : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {a.title} · {a.vehicle.plate}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3 px-4 py-3.5">
        <h2 className="text-xs font-semibold">Active vehicles by corridor</h2>
        <div className="space-y-2.5">
          {TOP_CORRIDORS.map((corridor) => (
            <div key={corridor.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{corridor.name}</p>
                <p className="shrink-0 text-xs font-medium text-muted-foreground">
                  {corridor.vehicles} {corridor.vehicles === 1 ? "vehicle" : "vehicles"}
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(corridor.vehicles / maxVehicles) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="py-2">
        <h2 className="px-4 pt-1.5 pb-1 text-xs font-semibold">On screen now</h2>
        <ul>
          {VEHICLES.map((v) => {
            const play = v.status === "active" ? playAt(v, liveUntil(v, t)) : null
            const zone = zoneAt(poseAt(v, t).position)
            const isSelected = selectedId === v.id
            return (
              <li key={v.id}>
                <button
                  type="button"
                  // First click finds it on the map; a second opens details.
                  onClick={() => (isSelected ? onExpand(v.id) : onSelect(v.id))}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                    isSelected && "bg-accent",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-[3px]",
                      v.status === "idle" && "bg-primary/45",
                      v.status === "offline" && "border border-dashed border-muted-foreground",
                    )}
                    style={play ? { backgroundColor: play.ad.color } : undefined}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {play ? play.ad.brand : v.status === "idle" ? "Standby" : "Offline"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {v.plate} · {zone.name}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
