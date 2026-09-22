"use client"

import { useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  BASEMAP_ORDER,
  BASEMAP_PRESETS,
  DEFAULT_BASEMAP,
  NAIROBI_CENTER,
  NAIROBI_DEFAULT_ZOOM,
  type BasemapId,
} from "@workspace/geo"
import { cn } from "@workspace/ui/lib/utils"
import { MapBasemapSelect } from "@workspace/ui/components/map-basemap-select"
import {
  Map,
  MapBuildings3D,
  MapControls,
  MapPitch,
  type MapControlsProps,
} from "@workspace/ui/components/map"

const BASEMAP_OPTIONS = BASEMAP_ORDER.map((id: BasemapId) => ({
  id,
  label: BASEMAP_PRESETS[id].label,
  description: BASEMAP_PRESETS[id].description,
}))

export type MapCanvasSummaryItem = {
  value: string
  label: string
  /** Optional status dot shown next to the label, e.g. "bg-primary" */
  dot?: string
}

export type MapCanvasProps = {
  /** Rail title, e.g. "Campaign map" */
  title: string
  description?: string
  /** Small stat row under the title — corridor counts, fleet status, etc. */
  summary?: MapCanvasSummaryItem[]
  /** Rail footer caption, e.g. "Illustrative data — not yet live" */
  note?: string
  /** The rail's scrollable list content */
  children?: ReactNode
  loadingLabel?: string
  /** Which optional controls to enable beyond the always-on zoom + compass */
  controls?: Pick<MapControlsProps, "showLocate" | "showFullscreen">
  className?: string
}

/**
 * Shared full-bleed map layout for the three actor map pages (customer,
 * driver, ops). Owns the frame that escapes the shell's content padding, the
 * basemap, the floating rail, and the control cluster — each app only
 * supplies its copy, its summary numbers and its rail list markup.
 */
export function MapCanvas({
  title,
  description,
  summary,
  note,
  children,
  loadingLabel = "Loading map",
  controls,
  className,
}: MapCanvasProps) {
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const [railOpen, setRailOpen] = useState(true)
  const preset = BASEMAP_PRESETS[basemap]

  return (
    <div
      className={cn(
        // Escapes the shell's `<main className="p-4 md:p-6">` so the map
        // touches all four edges of the inset card.
        // ponytail: coupled to that padding value, duplicated in all three
        // app shells today — if a shell's padding ever changes independently,
        // give MapCanvas its own prop instead of guessing here.
        "relative -m-4 h-[calc(100vh-3rem-2rem)] overflow-hidden md:-m-6 md:h-[calc(100vh-3rem-3rem)] md:rounded-b-xl",
        className,
      )}
    >
      <Map
        key={basemap}
        loadingLabel={loadingLabel}
        center={NAIROBI_CENTER}
        zoom={NAIROBI_DEFAULT_ZOOM}
        pitch={preset.pitch}
        maxPitch={68}
        className="absolute inset-0 h-full w-full"
        styles={{ light: preset.light, dark: preset.dark }}
      >
        <MapPitch pitch={preset.pitch} />
        <MapBuildings3D enabled={preset.buildings} />

        <div className="pointer-events-none absolute inset-y-3 left-3 z-10 flex max-w-[calc(100%-5.5rem)] items-start sm:max-w-sm">
          {railOpen ? (
            <div className="pointer-events-auto flex max-h-full w-80 max-w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
              <div className="flex items-start justify-between gap-2 border-b px-4 py-3.5">
                <div className="min-w-0 space-y-1">
                  <h1 className="truncate text-lg font-semibold tracking-tight">
                    {title}
                  </h1>
                  {description ? (
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setRailOpen(false)}
                  aria-label="Collapse panel"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
              </div>

              {summary && summary.length > 0 ? (
                <div
                  className="grid divide-x border-b"
                  style={{ gridTemplateColumns: `repeat(${summary.length}, minmax(0, 1fr))` }}
                >
                  {summary.map((stat) => (
                    <div key={stat.label} className="px-3 py-2.5 text-center">
                      <p className="text-base font-semibold leading-none">
                        {stat.value}
                      </p>
                      <div className="mt-1.5 flex items-center justify-center gap-1.5">
                        {stat.dot ? (
                          <span
                            className={cn("size-1.5 rounded-full", stat.dot)}
                            aria-hidden
                          />
                        ) : null}
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {stat.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {children ? (
                <div className="flex-1 divide-y overflow-y-auto">
                  {children}
                </div>
              ) : null}

              {note ? (
                <p className="border-t px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
                  {note}
                </p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              aria-label={`Show ${title.toLowerCase()} panel`}
              className="pointer-events-auto flex items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
            >
              <ChevronRight className="size-4" aria-hidden />
              {title}
            </button>
          )}
        </div>

        <MapBasemapSelect
          value={basemap}
          onValueChange={(value) => setBasemap(value as BasemapId)}
          options={BASEMAP_OPTIONS}
          position="top-right"
        />

        <MapControls
          position="bottom-right"
          showZoom
          showCompass
          showLocate={controls?.showLocate}
          showFullscreen={controls?.showFullscreen}
        />
      </Map>
    </div>
  )
}
