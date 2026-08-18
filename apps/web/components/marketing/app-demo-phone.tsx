"use client"

import { useLayoutEffect, useRef, useState } from "react"
import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import "./devices-iphone-14-pro.css"

/** iPhone 14 Pro logical screen — matches .device-screen in devices-iphone-14-pro.css */
const DEMO_SCREEN_WIDTH = 390
const DEMO_SCREEN_HEIGHT = 830

type AppDemoPhoneProps = {
  className?: string
  /** Path to the exported customer-mobile web build, served from apps/web/public. */
  src?: string
}

function ScaledAppDemoIframe({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateScale = () => {
      const width = el.clientWidth
      const height = el.clientHeight
      if (width <= 0 || height <= 0) return
      setScale(Math.min(width / DEMO_SCREEN_WIDTH, height / DEMO_SCREEN_HEIGHT))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const iframeEl = iframeRef.current
    if (!iframeEl) return

    // Mobile Safari doesn't repaint a CSS-`transform`-scaled iframe when a
    // web font (here, the Ionicons glyph font) finishes loading after first
    // paint — the icons stay frozen as tofu boxes until something else
    // forces a recomposite. Nudge opacity once the icon font is ready to
    // force that recomposite without touching layout/size.
    const forceRepaint = () => {
      iframeEl.style.opacity = "0.999"
      requestAnimationFrame(() => {
        iframeEl.style.opacity = "1"
      })
    }

    const handleLoad = () => {
      const fonts = iframeEl.contentDocument?.fonts
      if (!fonts) return
      fonts.ready.then(forceRepaint).catch(() => {})
      fonts.addEventListener("loadingdone", forceRepaint)
    }

    iframeEl.addEventListener("load", handleLoad)
    return () => iframeEl.removeEventListener("load", handleLoad)
  }, [])

  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  const inverseScalePercent = 100 / safeScale

  return (
    <div ref={containerRef} className="device-screen overflow-hidden">
      <iframe
        ref={iframeRef}
        title="Admobi app demo"
        src={src}
        allow="clipboard-write"
        className="origin-top-left border-0"
        style={{
          width: `${inverseScalePercent}%`,
          height: `${inverseScalePercent}%`,
          flexShrink: 0,
          transform: `scale(${safeScale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  )
}

/**
 * Renders the compiled customer-mobile Expo web export (public/app-demo,
 * see apps/customer-mobile's `export:web-demo` script) inside an iPhone 14
 * Pro frame built from Devices.css (MIT, github.com/picturepan2/devices.css;
 * vendored in ./devices-iphone-14-pro.css). The frame scales fluidly via
 * container-query transform (see .phone-demo-shell in that file) instead of
 * the library's fixed 428x868 px sizing.
 *
 * The iframe always lays out at the native 390×830 logical resolution and is
 * visually scaled to the current bezel size, so the app isn't squished when
 * the mockup is smaller than a real phone.
 *
 * The ~4MB app bundle only loads once the visitor presses "Try live demo" —
 * until then this renders the app's own splash screen as a static cover, so
 * embedding this on a busy page (the homepage) doesn't tax its load time.
 */
export function AppDemoPhone({ className, src = "/app-demo" }: AppDemoPhoneProps) {
  const [activated, setActivated] = useState(false)

  return (
    <div className={cn("relative mx-auto w-full max-w-[20rem] xl:max-w-[22rem]", className)}>
      <div
        aria-hidden
        className="absolute inset-x-10 bottom-[-1.75rem] h-14 rounded-full bg-black/30 blur-2xl dark:bg-black/55"
      />

      <div
        className="phone-demo-shell"
        style={{
          filter:
            "drop-shadow(0 45px 70px rgba(0,0,0,0.45)) drop-shadow(0 20px 35px rgba(0,0,0,0.3))",
        }}
      >
        <div className="device device-iphone-14-pro">
          <div className="device-frame">
            {activated ? (
              <ScaledAppDemoIframe src={src} />
            ) : (
              <button
                type="button"
                onClick={() => setActivated(true)}
                className="device-screen relative flex h-full w-full flex-col items-center justify-center gap-5 bg-black"
              >
                <Image
                  src="/app-demo-splash.png"
                  alt="Admobi"
                  width={340}
                  height={340}
                  style={{ objectFit: "contain" }}
                  className="h-[170em] w-[170em]"
                  priority
                />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out">
                  <svg width="9" height="11" viewBox="0 0 12 14" fill="currentColor" aria-hidden>
                    <path d="M0 1.3C0 .3.99-.3 1.8.2l9.5 5.7c.77.46.77 1.6 0 2.06L1.8 13.8C.99 14.3 0 13.7 0 12.7V1.3Z" />
                  </svg>
                  Try live demo
                </span>
              </button>
            )}
          </div>
          <div className="device-stripe" />
          <div className="device-header" />
          <div className="device-sensors" />
          <div className="device-btns" />
          <div className="device-power" />
        </div>
      </div>
    </div>
  )
}
