"use client"

import { useEffect, useRef, type CSSProperties } from "react"

/** The clip is 1280×720. Crop to the car, which also drops the generator's watermark. */
const CROP = { x: 200, y: 120, w: 900, h: 450 }
/** The roof screen's face in clip pixels: the anchor for placing the car in the scene. */
const SCREEN = { x: 658, y: 138, w: 172 }
/** Key at 2/3 of crop size: sharp enough at hero width, half the pixels to loop over. */
const KEY_W = 600
const KEY_H = 300

/**
 * Scene placement in RouteSignal's 800×450 viewBox: scene units per clip pixel,
 * chosen so the screen's top centre lands on the signal arcs' origin (400, 180)
 * and the tyres on the contact shadow at y 399.
 */
const SCALE = 0.534
const ORIGIN_X = 400 - (SCREEN.x + SCREEN.w / 2 - CROP.x) * SCALE
const ORIGIN_Y = 180 - (SCREEN.y - CROP.y) * SCALE

function sceneBox(x: number, y: number, w: number, h: number): CSSProperties {
  return {
    left: `${((ORIGIN_X + (x - CROP.x) * SCALE) / 800) * 100}%`,
    top: `${((ORIGIN_Y + (y - CROP.y) * SCALE) / 450) * 100}%`,
    width: `${((w * SCALE) / 800) * 100}%`,
    height: `${((h * SCALE) / 450) * 100}%`,
  }
}

const CAR_BOX = sceneBox(CROP.x, CROP.y, CROP.w, CROP.h)

/**
 * Chroma key tuning — adjust if green fringe remains on tires/windows.
 * softMin/hardMax: green-excess range (g − max(r,b)) for alpha matte.
 * despillStrength: how aggressively to pull green toward neutral (0–1).
 */
const KEY = {
  softMin: 10,
  hardMax: 40,
  /** Allow a little green above max(r,b) on bright white body paint */
  maxGreenOverRb: 6,
  despillStrength: 0.85,
  /** Extra despill on partial-alpha edge pixels (tire/window halos) */
  edgeDespillBoost: 1.35,
  /** Dark interior/glass: clamp green when it dominates other channels */
  darkSpillThreshold: 72,
  darkSpillStrength: 0.88,
} as const

function keyPixel(r: number, g: number, b: number): [number, number, number, number] {
  const maxRb = Math.max(r, b)
  const greenExcess = g - maxRb

  let alpha = 255
  if (greenExcess > KEY.softMin) {
    if (greenExcess >= KEY.hardMax) {
      return [r, g, b, 0]
    }
    const edge = (greenExcess - KEY.softMin) / (KEY.hardMax - KEY.softMin)
    alpha = Math.round(255 * (1 - edge))
  }

  let outG = g

  const capG = maxRb + KEY.maxGreenOverRb
  if (outG > capG) {
    outG = capG
  }

  const avgRb = (r + b) * 0.5
  const spill = outG - avgRb
  if (spill > 0) {
    let strength: number = KEY.despillStrength
    if (alpha < 255) {
      strength = Math.min(1, strength * KEY.edgeDespillBoost)
    }
    outG = Math.round(outG - spill * strength)
  }

  const luma = r + outG + b
  if (luma < KEY.darkSpillThreshold && outG > r && outG > b) {
    outG = Math.round(outG - (outG - maxRb) * KEY.darkSpillStrength)
  }

  return [r, outG, b, alpha]
}

export function GreenScreenCarVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    canvas.width = KEY_W
    canvas.height = KEY_H

    let running = false
    let frameId = 0
    // Key once per decoded frame (24fps) where supported, not once per display refresh.
    const schedule = () => {
      frameId =
        "requestVideoFrameCallback" in video
          ? video.requestVideoFrameCallback(renderFrame)
          : requestAnimationFrame(renderFrame)
    }

    const renderFrame = () => {
      if (!running) return
      if (video.videoWidth === 0 || video.paused || video.ended) {
        schedule()
        return
      }

      try {
        ctx.drawImage(video, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, KEY_W, KEY_H)
        const frame = ctx.getImageData(0, 0, KEY_W, KEY_H)
        const data = frame.data
        const len = data.length

        for (let i = 0; i < len; i += 4) {
          const [r, g, b, a] = keyPixel(data[i]!, data[i + 1]!, data[i + 2]!)
          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          data[i + 3] = a
        }

        ctx.putImageData(frame, 0, 0)
      } catch {
        // ignore transient canvas errors
      }

      schedule()
    }

    const start = () => {
      if (running) return
      running = true
      renderFrame()
    }

    video.addEventListener("loadedmetadata", start)
    video.addEventListener("play", start)
    video.load()
    video.play()?.catch(() => {})

    return () => {
      running = false
      if ("cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(frameId)
      cancelAnimationFrame(frameId)
      video.removeEventListener("loadedmetadata", start)
      video.removeEventListener("play", start)
    }
  }, [])

  return (
    <div className="anim-drive-bob pointer-events-none absolute inset-0 z-10">
      <video
        ref={videoRef}
        src="/videos/car-hero-screen-greenscreen.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="pointer-events-none absolute opacity-0"
      />
      <canvas ref={canvasRef} className="absolute" style={CAR_BOX} />
    </div>
  )
}
