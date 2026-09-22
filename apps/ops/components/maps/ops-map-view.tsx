"use client"

import { MapCanvas } from "@workspace/ui/components/map-canvas"

const FLEET_STATUS = [
  { value: "24", label: "Active", dot: "bg-primary" },
  { value: "7", label: "Idle", dot: "bg-primary/45" },
  { value: "5", label: "Offline", dot: "bg-muted-foreground/40" },
] as const

type CorridorDensity = {
  id: string
  name: string
  drivers: number
}

const TOP_CORRIDORS: CorridorDensity[] = [
  { id: "1", name: "Nairobi CBD", drivers: 11 },
  { id: "2", name: "Westlands", drivers: 8 },
  { id: "3", name: "Mombasa Rd", drivers: 6 },
  { id: "4", name: "Karen", drivers: 4 },
]

const maxDrivers = Math.max(...TOP_CORRIDORS.map((c) => c.drivers))

export function OpsMapView() {
  return (
    <MapCanvas
      title="Network map"
      description="Live view of Nairobi's driver network and corridor coverage."
      summary={FLEET_STATUS.map((stat) => ({ ...stat }))}
      note="Live GPS overlays connecting soon"
      loadingLabel="Loading network map"
      controls={{ showLocate: true, showFullscreen: true }}
    >
      <div className="space-y-3 px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Top corridors by driver density
        </p>
        <div className="space-y-2.5">
          {TOP_CORRIDORS.map((corridor) => (
            <div key={corridor.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{corridor.name}</p>
                <p className="shrink-0 text-xs font-medium text-muted-foreground">
                  {corridor.drivers} drivers
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${(corridor.drivers / maxDrivers) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MapCanvas>
  )
}
