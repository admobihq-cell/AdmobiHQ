"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, ChevronLeft, Link2, LocateFixed } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { AdScreen } from "./ad-screen"
import { useSimNow } from "./clock"
import {
  CORRIDOR_NAMES,
  SLOT_SECONDS,
  brightnessAt,
  liveUntil,
  panelTempAt,
  plateSlug,
  playAt,
  playLog,
  poseAt,
  speedAt,
  zoneAt,
  zoneRotation,
  type DemoVehicle,
  type VehicleStatus,
} from "./fleet"

const STATUS: Record<VehicleStatus, { label: string; dot: string }> = {
  active: { label: "Live", dot: "bg-primary" },
  idle: { label: "Standby", dot: "bg-primary/45" },
  offline: { label: "Offline", dot: "bg-muted-foreground/40" },
}

export function StatusPill({ status }: { status: VehicleStatus }) {
  const s = STATUS[status]
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium">
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", s.dot, status === "active" && "motion-safe:animate-pulse")}
      />
      {s.label}
    </span>
  )
}

/** Copies a deep link to this map view, e.g. /map?vehicle=KDH-482T */
export function CopyLinkButton({ query }: { query: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${query}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt("Copy this link", url)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  )
}

export function formatCountdown(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

const clockTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Nairobi",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

export function VehicleDetails({
  vehicle: v,
  following,
  onFollow,
  onBack,
  backLabel = "All vehicles",
}: {
  vehicle: DemoVehicle
  following: boolean
  onFollow: () => void
  onBack: () => void
  backLabel?: string
}) {
  const t = useSimNow(0.25)
  const topRef = useRef<HTMLDivElement>(null)

  // The rail's scroll container is shared with the fleet list — start each
  // vehicle at the top, not wherever the list was scrolled to.
  useEffect(() => {
    topRef.current?.parentElement?.scrollTo({ top: 0 })
  }, [])
  const offline = v.status === "offline"
  const idle = v.status === "idle"
  const play = idle ? null : playAt(v, liveUntil(v, t))
  const next = v.status === "active" && play ? playAt(v, play.end) : null
  const { position, heading } = poseAt(v, t)
  const zone = zoneAt(position)
  const rotation = zoneRotation(zone.id)
  const log = playLog(v, t, 8)
  const progress = play && !offline ? ((t - play.start) / SLOT_SECONDS) * 100 : 0

  return (
    <>
      <div ref={topRef} className="space-y-3 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            {backLabel}
          </button>
          <CopyLinkButton query={`vehicle=${plateSlug(v)}`} />
        </div>

        <div className={cn(v.kind === "bike" && "rounded-[3px] bg-[#07080a] py-3")}>
          <AdScreen
            ad={play?.ad ?? null}
            shape={v.kind}
            startedAt={play?.start ?? 0}
            frozen={offline}
            className={cn(v.kind === "bike" && "mx-auto w-40")}
          />
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          {play && !offline ? (
            <div className="h-full" style={{ width: `${progress}%`, backgroundColor: play.ad.color }} />
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {offline ? `Last played ${play?.ad.brand}` : (play?.ad.brand ?? "Standby")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {play ? `${play.ad.campaign} · ${play.ad.advertiser}` : "No spot booked while parked"}
            </p>
          </div>
          <StatusPill status={v.status} />
        </div>

        {next && play ? (
          <p className="text-xs text-muted-foreground">
            Up next{" "}
            <span className="font-medium text-foreground">{next.ad.brand}</span> in{" "}
            <span className="tabular-nums">{formatCountdown(play.end - t)}</span>
          </p>
        ) : null}

        <p className="text-[11px] text-muted-foreground">
          {v.kind === "taxi"
            ? "Taxi-top, double-sided 960×320 mm. Both faces show the same spot."
            : "Bike box, three faces 320×320 mm. All faces show the same spot."}
        </p>

        {v.status === "active" ? (
          <button
            type="button"
            onClick={onFollow}
            aria-pressed={following}
            className={cn(
              "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              following ? "border-primary/40 bg-primary/8 text-primary" : "hover:bg-accent",
            )}
          >
            <LocateFixed className="size-3.5" aria-hidden />
            {following ? "Following on map" : "Follow on map"}
          </button>
        ) : null}
      </div>

      <Section title="Location">
        <Row label="Zone" value={zone.name} />
        <Row label="Corridor" value={CORRIDOR_NAMES[v.corridor]} />
        <Row label="Speed" value={offline ? "—" : `${speedAt(v, t)} km/h`} />
        <Row
          label="Heading"
          value={v.status === "active" ? `${COMPASS[Math.round(heading / 45) % 8]} ${Math.round(heading)}°` : "Stationary"}
        />
        <Row
          label="Position"
          value={`${position[1].toFixed(5)}, ${position[0].toFixed(5)}`}
        />
      </Section>

      <Section title={offline ? "Play log before signal loss" : "Play log"}>
        <ol className="space-y-1.5">
          {log.map((p) => (
            <li key={p.start} className="flex items-center gap-2 text-xs">
              <span className="w-15 shrink-0 text-muted-foreground tabular-nums">
                {clockTime.format(p.start * 1000)}
              </span>
              <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: p.ad.color }} />
              <span className="min-w-0 flex-1 truncate font-medium">{p.ad.brand}</span>
              <span className="shrink-0 text-muted-foreground">{p.zone.name}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={zone.id === "network" ? "Run-of-network rotation" : `Booked in ${zone.name}`}>
        <ul className="space-y-1.5">
          {rotation.map((ad) => {
            const current = !offline && play?.ad.id === ad.id
            return (
              <li key={ad.id} className="flex items-center gap-2 text-xs">
                <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: ad.color }} />
                <span className={cn("min-w-0 flex-1 truncate", current && "font-semibold")}>{ad.brand}</span>
                <span className="shrink-0 text-muted-foreground">
                  {current ? "On screen" : `${Math.round(100 / rotation.length)}% share`}
                </span>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title="Screen health">
        <Row label="Brightness" value={offline ? "—" : `${idle ? 30 : brightnessAt(t)}% · auto`} />
        <Row label="Panel temp" value={offline ? "—" : `${panelTempAt(v, t)}°C`} />
        <Row label="Signal" value={offline ? "No signal" : <SignalBars bars={v.signal} />} />
        <Row label="Firmware" value={v.firmware} />
        <Row
          label="Last heartbeat"
          value={offline ? `${v.minutesAgo} min ago` : `${1 + (Math.floor(t) % 3)}s ago`}
        />
      </Section>

      <Section title="Vehicle">
        <Row label="Plate" value={v.plate} />
        <Row label="Screen serial" value={v.serial} />
        <Row label="Driver" value={v.driver} />
        <Row label="Fleet partner" value={v.partner} />
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5 px-4 py-3.5">
      <h2 className="text-xs font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium tabular-nums">{value}</span>
    </div>
  )
}

function SignalBars({ bars }: { bars: number }) {
  return (
    <span className="inline-flex items-end gap-0.5" role="img" aria-label={`${bars} of 4 bars`}>
      {[1, 2, 3, 4].map((b) => (
        <span
          key={b}
          className={cn("w-1 rounded-[1px]", b <= bars ? "bg-foreground" : "bg-muted")}
          style={{ height: 3 + b * 2.5 }}
        />
      ))}
    </span>
  )
}
