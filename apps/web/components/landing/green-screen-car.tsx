"use client"

import { useEffect, useRef } from "react"

const W = 1280
const H = 720
const KEY_W = 640
const KEY_H = 360

export function GreenScreenCarVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Half-resolution offscreen canvas: 4x fewer pixels to key per frame
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

      // Crop the bottom 8% of the video frame to drop any bottom border artifacts
      const cropHeight = video.videoHeight * 0.92

      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }

      try {
        // Downscale into the key canvas, chroma key it, then upscale to the visible canvas
        keyCtx.drawImage(video, 0, 0, video.videoWidth, cropHeight, 0, 0, KEY_W, KEY_H)
        const frame = keyCtx.getImageData(0, 0, KEY_W, KEY_H)
        const data = frame.data
        const len = data.length

        for (let i = 0; i < len; i += 4) {
          const r = data[i]!
          const g = data[i + 1]!
          const b = data[i + 2]!

          // Green screen chroma keying with feathering and despill
          const maxRB = Math.max(r, b)
          const greenDiff = g - maxRB

          if (greenDiff > 15) {
            if (greenDiff > 40) {
              data[i + 3] = 0 // Transparent background
            } else {
              // Smooth feathering transition zone
              const alphaFactor = (greenDiff - 15) / 25
              data[i + 3] = Math.round(255 * (1 - alphaFactor))
            }
          } else {
            data[i + 3] = 255
            // Despill: suppress green tint on edges
            if (g > maxRB && g - maxRB < 30) {
              data[i + 1] = Math.round((r + b) / 2)
            }
          }
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
    const playPromise = video.play()
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked; retry on next interaction
      })
    }

    return () => {
      running = false
      cancelAnimationFrame(animationFrameId)
      video.removeEventListener("loadedmetadata", start)
      video.removeEventListener("play", start)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
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
          left: '14.3%',
          top: '54.7%',
          width: '62%',
          height: '41%',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}
