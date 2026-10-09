"use client"

import { useEffect, useRef, type CSSProperties } from "react"

import { cn } from "@workspace/ui/lib/utils"

import type { DemoAd } from "./fleet"

// Faint P2.5-style dot matrix over the creative so it reads as an LED face,
// not a video player.
const LED_GRID: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, transparent 0 40%, rgb(0 0 0 / 0.5) 78%)",
  backgroundSize: "3px 3px",
}

type AdScreenProps = {
  /** null = the unit is in standby (no paid spot booked right now) */
  ad: DemoAd | null
  /** Taxi-top is a 960x320mm strip (3:1); the bike box face is square. */
  shape: "taxi" | "bike"
  /** Epoch seconds the spot started, so every view of it plays in sync */
  startedAt: number
  /** Offline: freeze on the last frame and grey it out */
  frozen?: boolean
  className?: string
}

export function AdScreen({ ad, shape, startedAt, frozen, className }: AdScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = () => {
      if (!video.duration) return
      video.currentTime = frozen
        ? Math.min(1.5, video.duration / 2)
        : (Date.now() / 1000 - startedAt) % video.duration
    }
    if (video.readyState >= 1) sync()
    else video.addEventListener("loadedmetadata", sync, { once: true })
    return () => video.removeEventListener("loadedmetadata", sync)
  }, [ad?.src, startedAt, frozen])

  const taxi = shape === "taxi"

  return (
    <div
      className={cn(
        "@container relative overflow-hidden rounded-[3px] bg-[#07080a] ring-1 ring-black/60",
        taxi ? "aspect-[3/1]" : "aspect-square",
        className,
      )}
    >
      {ad ? (
        <>
          <video
            key={ad.src}
            ref={videoRef}
            src={ad.src}
            muted
            loop
            playsInline
            autoPlay={!frozen}
            preload="auto"
            aria-hidden
            className={cn(
              "absolute object-cover",
              taxi ? "inset-y-0 right-0 h-full w-[72%]" : "inset-0 size-full",
              frozen && "grayscale",
            )}
          />
          <div
            className={cn(
              "absolute flex flex-col justify-center",
              taxi
                ? "inset-y-0 left-0 w-[42%] gap-[1.2cqw] py-[3cqw] pr-[7cqw] pl-[3.2cqw]"
                : "inset-x-0 bottom-0 gap-[2cqw] px-[6cqw] pt-[12cqw] pb-[6cqw]",
              frozen && "grayscale",
            )}
            style={{
              backgroundColor: ad.color,
              color: ad.ink,
              clipPath: taxi
                ? "polygon(0 0, 100% 0, 84% 100%, 0 100%)"
                : "polygon(0 9cqw, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            <p
              className={cn(
                "leading-[0.88] font-black tracking-[-0.03em] uppercase",
                taxi ? "text-[5.4cqw]" : "text-[10cqw]",
              )}
            >
              {ad.brand}
            </p>
            <p
              className={cn(
                "leading-tight font-medium opacity-90",
                taxi ? "text-[2.5cqw]" : "text-[6cqw]",
              )}
            >
              {ad.tagline}
            </p>
          </div>
          {taxi ? (
            <p
              className="absolute right-[2cqw] bottom-[2.4cqw] rounded-[0.6cqw] px-[1.2cqw] py-[0.5cqw] text-[2.2cqw] font-semibold"
              style={{ backgroundColor: ad.color, color: ad.ink }}
            >
              {ad.cta}
            </p>
          ) : null}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1cqw] text-white/45">
          <p className={cn("font-semibold tracking-tight", taxi ? "text-[4cqw]" : "text-[10cqw]")}>
            admobi
          </p>
          <p className={cn("tracking-wide uppercase", taxi ? "text-[1.8cqw]" : "text-[4.5cqw]")}>
            Standby · no spot booked
          </p>
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={LED_GRID} />
      {frozen ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
          <p className="rounded-sm bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
            No signal · last frame
          </p>
        </div>
      ) : null}
    </div>
  )
}
