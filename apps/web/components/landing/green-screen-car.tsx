"use client"

import { useEffect, useRef } from "react"

const W = 1280
const H = 720
const KEY_W = 640
const KEY_H = 360

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
    let strength = KEY.despillStrength
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

    const keyCanvas = document.createElement("canvas")
    keyCanvas.width = KEY_W
    keyCanvas.height = KEY_H
    const keyCtx = keyCanvas.getContext("2d", { willReadFrequently: true })
    if (!keyCtx) return

    let animationFrameId = 0
    let running = false

    const renderFrame = () => {
      if (!running) return
      if (video.videoWidth === 0 || video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(renderFrame)
        return
      }

      const cropHeight = video.videoHeight * 0.92

      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }

      try {
        keyCtx.drawImage(video, 0, 0, video.videoWidth, cropHeight, 0, 0, KEY_W, KEY_H)
        const frame = keyCtx.getImageData(0, 0, KEY_W, KEY_H)
        const data = frame.data
        const len = data.length

        for (let i = 0; i < len; i += 4) {
          const [r, g, b, a] = keyPixel(data[i]!, data[i + 1]!, data[i + 2]!)
          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          data[i + 3] = a
        }

        keyCtx.putImageData(frame, 0, 0)
        ctx.clearRect(0, 0, W, H)
        ctx.drawImage(keyCanvas, 0, 0, W, H)
      } catch {
        // ignore transient canvas errors
      }

      animationFrameId = requestAnimationFrame(renderFrame)
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
      cancelAnimationFrame(animationFrameId)
      video.removeEventListener("loadedmetadata", start)
      video.removeEventListener("play", start)
    }
  }, [])

  return (
    <div className="anim-drive-bob pointer-events-none absolute inset-0 z-10">
      <video
        ref={videoRef}
        src="/videos/car-hero-admobi-greenscreen.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="pointer-events-none absolute opacity-0"
      />
      <canvas
        ref={canvasRef}
        className="absolute"
        style={{
          left: "14.3%",
          top: "54.7%",
          width: "62%",
          height: "41%",
          objectFit: "contain",
        }}
      />
    </div>
  )
}
