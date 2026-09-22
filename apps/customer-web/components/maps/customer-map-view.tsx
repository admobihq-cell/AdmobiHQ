"use client"

import { MapCanvas } from "@workspace/ui/components/map-canvas"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const MAP_SUMMARY = [
  { value: "3", label: "Corridors" },
  { value: "12.4k", label: "Plays today" },
  { value: "84%", label: "Delivery" },
] as const

type CorridorStatus = "live" | "scheduled"

type CoverageCorridor = {
  id: string
  name: string
  screens: string
  reach: string
  status: CorridorStatus
}

const COVERAGE_CORRIDORS: CoverageCorridor[] = [
  {
    id: "1",
    name: "Nairobi CBD",
    screens: "18 screens",
    reach: "142k reach",
    status: "live",
  },
  {
    id: "2",
    name: "Westlands",
    screens: "12 screens",
    reach: "96k reach",
    status: "live",
  },
  {
    id: "3",
    name: "Mombasa Rd",
    screens: "6 screens",
    reach: "44k reach",
    status: "live",
  },
  {
    id: "4",
    name: "Karen",
    screens: "9 screens",
    reach: "—",
    status: "scheduled",
  },
]

const STATUS_LABEL: Record<CorridorStatus, string> = {
  live: "Live",
  scheduled: "Scheduled",
}

export function CustomerMapView() {
  return (
    <MapCanvas
      title="Campaign map"
      description="Where your campaign is running across Nairobi's taxi-top corridors."
      summary={MAP_SUMMARY.map((stat) => ({ ...stat }))}
      note="Illustrative data — not yet live"
      loadingLabel="Loading campaign map"
      controls={{ showFullscreen: true }}
    >
      {COVERAGE_CORRIDORS.map((corridor) => (
        <div
          key={corridor.id}
          className="flex items-start justify-between gap-3 px-4 py-3.5"
        >
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold">{corridor.name}</p>
            <p className="text-xs text-muted-foreground">
              {corridor.screens} · {corridor.reach}
            </p>
          </div>
          <Badge
            variant={corridor.status === "live" ? "default" : "outline"}
            className={cn(
              "shrink-0",
              corridor.status === "scheduled" && "text-muted-foreground",
            )}
          >
            {STATUS_LABEL[corridor.status]}
          </Badge>
        </div>
      ))}
    </MapCanvas>
  )
}
