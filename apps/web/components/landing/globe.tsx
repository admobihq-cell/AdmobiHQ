"use client"

import createGlobe from "cobe"
import { useEffect, useRef } from "react"

/**
 * Points that carry a floating badge. Spread across longitudes so a badge or two
 * is always facing the viewer as the globe turns — trim this to the Kenyan rows
 * if the badges should only claim the markets that are actually live.
 */
const ANCHORS = [
  { lat: -1.2921, lng: 36.8219, live: "Nairobi", sat: "GPS lock" },
  { lat: 13.7563, lng: 100.5018, live: "Bangkok", sat: "Uplink" },
  { lat: -33.8688, lng: 151.2093, live: "Sydney", sat: "GPS lock" },
  { lat: 21.3069, lng: -157.8583, live: "Honolulu", sat: "Uplink" },
  { lat: 19.4326, lng: -99.1332, live: "Mexico City", sat: "GPS lock" },
  { lat: 38.7223, lng: -9.1393, live: "Lisbon", sat: "Uplink" },
] as const

// cobe's own helper: face the globe at a lat/long.
function locationToAngles(lat: number, long: number): [number, number] {
  return [Math.PI - ((long * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180]
}

const [NAIROBI_PHI, NAIROBI_THETA] = locationToAngles(-1.2921, 36.8219)

const RAD = Math.PI / 180
// ponytail: cobe draws the sphere at ~0.79 of the canvas half-width at scale 1.
// Measured against a rendered marker, not derived. Retune if `scale` ever changes.
const SPHERE_RATIO = 0.79
const SWAP_MS = 4000

export function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    if (!canvas || !overlay) return

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const size = () => canvas.offsetWidth * 2
    const badges = Array.from(overlay.children) as HTMLElement[]

    let phi = NAIROBI_PHI
    let dragStartX: number | null = null
    let dragTarget = 0 // radians added by the current drag
    let drag = 0 // eased toward dragTarget so the globe glides instead of snapping

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size(),
      height: size(),
      phi,
      theta: NAIROBI_THETA,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.93, 0.92, 0.9],
      markerColor: [0.85, 0.16, 0.16],
      glowColor: [0.98, 0.97, 0.95],
      // Flat on the surface, so the dots line up with the badges projected below.
      markerElevation: 0,
      markers: ANCHORS.map((a) => ({ location: [a.lat, a.lng] as [number, number], size: 0.04 })),
    })

    // Project each anchor onto the canvas for the current rotation and park its
    // badge there. Anchors on the far side of the sphere fade out.
    const placeBadges = (rotation: number) => {
      const half = canvas.offsetWidth / 2
      const r = half * SPHERE_RATIO
      ANCHORS.forEach((anchor, i) => {
        const badge = badges[i]
        if (!badge) return
        const lat = anchor.lat * RAD
        // Zero when the anchor is dead centre; grows eastward.
        const alpha = rotation + anchor.lng * RAD - 1.5 * Math.PI
        const x = Math.cos(lat) * Math.sin(alpha)
        const front = Math.cos(lat) * Math.cos(alpha)
        const y = Math.sin(lat) * Math.cos(NAIROBI_THETA) - front * Math.sin(NAIROBI_THETA)
        const z = Math.sin(lat) * Math.sin(NAIROBI_THETA) + front * Math.cos(NAIROBI_THETA)
        // Fade across the limb rather than popping in and out.
        const opacity = Math.max(0, Math.min(1, (z - 0.08) / 0.22))
        badge.style.opacity = String(opacity)
        badge.style.visibility = opacity === 0 ? "hidden" : "visible"
        badge.style.transform = `translate(-50%, -140%) translate(${half + x * r}px, ${half - y * r}px)`
      })
    }

    let raf = 0
    const tick = () => {
      if (dragStartX === null && !still) phi += 0.0022 // ~48s per rotation
      drag += (dragTarget - drag) * 0.08
      globe.update({ width: size(), height: size(), phi: phi + drag })
      placeBadges(phi + drag)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // Alternate every badge between its LIVE and satellite face.
    let live = true
    const swap = setInterval(() => {
      live = !live
      overlay.dataset.mode = live ? "live" : "sat"
    }, SWAP_MS)

    const onDown = (e: PointerEvent) => {
      dragStartX = e.clientX - dragTarget * 200
      canvas.style.cursor = "grabbing"
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (dragStartX === null) return
      dragTarget = (e.clientX - dragStartX) / 200
    }
    const onUp = () => {
      if (dragStartX === null) return
      dragStartX = null
      canvas.style.cursor = "grab"
      // Fold the drag into phi so the idle spin resumes from where it was left.
      phi += dragTarget
      dragTarget = 0
      drag = 0
    }

    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", onUp)
    canvas.addEventListener("pointercancel", onUp)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(swap)
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("pointercancel", onUp)
      globe.destroy()
    }
  }, [])

  return (
    <div className={`relative ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="block w-full"
        // pan-y keeps vertical page scrolling while horizontal drags spin the globe.
        style={{
          aspectRatio: "1",
          contain: "layout paint size",
          cursor: "grab",
          touchAction: "pan-y",
        }}
        aria-hidden
      />
      <div
        ref={overlayRef}
        data-mode="live"
        className="globe-badges pointer-events-none absolute inset-0"
        aria-hidden
      >
        {ANCHORS.map((anchor) => (
          <span
            key={anchor.live}
            className="absolute left-0 top-0 whitespace-nowrap rounded-md bg-foreground/90 px-2.5 py-1.5 font-mono text-[0.65rem] tracking-wider text-background shadow-sm"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            <span data-face="live" className="flex items-center gap-2">
              <span className="bg-destructive size-1.5 rounded-full" />
              <span className="text-destructive font-semibold uppercase">Live</span>
              <span className="bg-background/30 h-3 w-px" />
              {anchor.live}
            </span>
            <span data-face="sat" className="flex items-center gap-2">
              <SatelliteIcon />
              <span className="font-semibold uppercase opacity-90">Sat</span>
              <span className="bg-background/30 h-3 w-px" />
              {anchor.sat}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function SatelliteIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="6.5" y="6.5" width="3" height="3" rx="0.5" />
      <path d="M6.5 8H3.2M12.8 8H9.5M8 6.5V3.2M8 9.5v3.3" strokeLinecap="round" />
      <path d="M1.6 6.4h1.6v3.2H1.6zM12.8 6.4h1.6v3.2h-1.6z" />
    </svg>
  )
}
