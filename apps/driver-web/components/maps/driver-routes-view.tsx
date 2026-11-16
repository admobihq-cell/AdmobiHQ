"use client"

import { useMemo } from "react"

import { MapCanvas } from "@workspace/ui/components/map-canvas"

import { SampleTag } from "@/components/sample-tag"
import { formatHours, formatKm, sampleTelemetry } from "@/lib/sample-data"

/** Last seven days, the same sample the dashboard opens on, so the two pages agree. */
export function DriverRoutesView() {
  const t = useMemo(() => sampleTelemetry({ range: "7d" }), [])
  const top = t.areas[0]?.value ?? 0

  return (
    <MapCanvas
      title="Your routes"
      description="Where your screen spent its time in the last 7 days."
      summary={[
        { value: String(t.areas.length), label: "Areas" },
        { value: formatHours(t.totals.hours), label: "Screen-on" },
        { value: formatKm(t.totals.km), label: "Driven" },
      ]}
      note="Sample figures. Real routes appear once your screen reports where it has been."
      loadingLabel="Loading your routes"
    >
      <ol className="divide-y">
        {t.areas.map((area, index) => {
          const days = t.days.filter((d) => d.area === area.name)
          const plays = days.reduce((s, d) => s + d.plays, 0)
          return (
            <li key={area.name} className="space-y-2 px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">
                  <span className="mr-2 text-xs font-medium text-muted-foreground tabular-nums">{index + 1}</span>
                  {area.name}
                </p>
                <p className="flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums">
                  <SampleTag />
                  {formatHours(area.value)}
                </p>
              </div>
              <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${top ? (area.value / top) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {days.length} {days.length === 1 ? "day" : "days"} · {plays.toLocaleString("en-KE")} ad plays
              </p>
            </li>
          )
        })}
      </ol>
    </MapCanvas>
  )
}
