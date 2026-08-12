"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react"

import { cn } from "@workspace/ui/lib/utils"
import { useTheme } from "@workspace/ui/components/theme-provider"

/** Light → dark */
const ENTER = {
  duration: 2000,
  glowDelay: 500,
  glowDuration: 1200,
  paletteReleaseAt: 0.68,
  paletteCrossfade: 900,
} as const

/** Dark → light */
const EXIT = {
  duration: 3200,
  glowDuration: 1560,
} as const

type HeroTransitionContextValue = {
  registerBackdrop: (el: SVGRectElement | null) => void
  registerGlow: (el: SVGEllipseElement | null) => void
}

const HeroTransitionContext = createContext<HeroTransitionContextValue | null>(null)

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2.8)
}

function easeEnterBackdrop(t: number): number {
  if (t <= 0.12) {
    return (t / 0.12) * 0.28
  }
  return 0.28 + easeOut((t - 0.12) / 0.88) * 0.72
}

function snapDusk(isDark: boolean, backdrop: SVGRectElement | null, glow: SVGEllipseElement | null) {
  const backdropOpacity = isDark ? 1 : 0
  const glowOpacity = isDark ? 0.18 : 0
  if (backdrop) backdrop.style.opacity = String(backdropOpacity)
  if (glow) glow.style.opacity = String(glowOpacity)
  return { backdropOpacity, glowOpacity }
}

function useHeroTransitionEngine(shellRef: RefObject<HTMLDivElement | null>) {
  const { resolvedTheme } = useTheme()
  const lastTheme = useRef<"light" | "dark" | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const backdropRef = useRef<SVGRectElement | null>(null)
  const glowRef = useRef<SVGEllipseElement | null>(null)
  const backdropOpacity = useRef(0)
  const glowOpacity = useRef(0)
  const paletteMix = useRef(0)

  const setPaletteMix = (value: number) => {
    paletteMix.current = value
    shellRef.current?.style.setProperty("--hero-palette-mix", String(value))
  }

  const registerBackdrop = useCallback((el: SVGRectElement | null) => {
    backdropRef.current = el
    if (el) el.style.opacity = String(backdropOpacity.current)
  }, [])

  const registerGlow = useCallback((el: SVGEllipseElement | null) => {
    glowRef.current = el
    if (el) el.style.opacity = String(glowOpacity.current)
  }, [])

  useEffect(() => {
    if (!resolvedTheme) return

    const themeKey = resolvedTheme
    const isDark = resolvedTheme === "dark"

    const cancel = () => {
      if (cancelRef.current) {
        cancelRef.current()
        cancelRef.current = null
      }
    }

    if (lastTheme.current === null) {
      lastTheme.current = themeKey
      const snapped = snapDusk(isDark, backdropRef.current, glowRef.current)
      backdropOpacity.current = snapped.backdropOpacity
      glowOpacity.current = snapped.glowOpacity
      setPaletteMix(isDark ? 1 : 0)
      return
    }

    if (lastTheme.current === themeKey) return
    lastTheme.current = themeKey

    cancel()

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reducedMotion) {
      const snapped = snapDusk(isDark, backdropRef.current, glowRef.current)
      backdropOpacity.current = snapped.backdropOpacity
      glowOpacity.current = snapped.glowOpacity
      setPaletteMix(isDark ? 1 : 0)
      return
    }

    const fromBackdrop = backdropOpacity.current
    const fromGlow = glowOpacity.current
    const backdrop = backdropRef.current
    const glow = glowRef.current

    if (isDark) {
      setPaletteMix(0)
      let paletteReleaseStart: number | null = null
      const startAt = performance.now()
      let raf = 0

      const tick = (now: number) => {
        const elapsed = now - startAt
        const t = Math.min(1, elapsed / ENTER.duration)
        const nextBackdrop =
          fromBackdrop + (1 - fromBackdrop) * easeEnterBackdrop(t)

        const glowElapsed = elapsed - ENTER.glowDelay
        let nextGlow = fromGlow
        if (glowElapsed > 0) {
          const glowT = Math.min(1, glowElapsed / ENTER.glowDuration)
          nextGlow = fromGlow + (0.18 - fromGlow) * easeOut(glowT)
        }

        backdropOpacity.current = nextBackdrop
        glowOpacity.current = nextGlow
        if (backdrop) backdrop.style.opacity = String(nextBackdrop)
        if (glow) glow.style.opacity = String(nextGlow)

        if (nextBackdrop >= ENTER.paletteReleaseAt) {
          if (paletteReleaseStart === null) {
            paletteReleaseStart = now
          }
          const mixT = Math.min(1, (now - paletteReleaseStart) / ENTER.paletteCrossfade)
          setPaletteMix(easeOut(mixT))
        } else {
          paletteReleaseStart = null
          setPaletteMix(0)
        }

        if (t < 1) {
          raf = requestAnimationFrame(tick)
        } else {
          setPaletteMix(1)
        }
      }

      raf = requestAnimationFrame(tick)
      cancelRef.current = () => cancelAnimationFrame(raf)
      return cancel
    }

    setPaletteMix(0)
    const startAt = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const elapsed = now - startAt
      const t = Math.min(1, elapsed / EXIT.duration)

      const glowT = Math.min(1, elapsed / EXIT.glowDuration)
      const nextGlow = fromGlow * (1 - easeOut(glowT))
      const nextBackdrop = fromBackdrop * (1 - easeOut(t))

      backdropOpacity.current = nextBackdrop
      glowOpacity.current = nextGlow
      if (backdrop) backdrop.style.opacity = String(nextBackdrop)
      if (glow) glow.style.opacity = String(nextGlow)

      if (t < 1) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    cancelRef.current = () => cancelAnimationFrame(raf)
    return cancel
  }, [resolvedTheme, shellRef])

  return { registerBackdrop, registerGlow }
}

export function HeroSceneShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const engine = useHeroTransitionEngine(shellRef)

  return (
    <HeroTransitionContext.Provider value={engine}>
      <div
        ref={shellRef}
        className={cn("hero-scene-mix relative w-full aspect-[16/9]", className)}
        style={{ ["--hero-palette-mix" as string]: 0 }}
      >
        {children}
      </div>
    </HeroTransitionContext.Provider>
  )
}

export function HeroDuskLayers() {
  const ctx = useContext(HeroTransitionContext)

  return (
    <>
      <rect
        ref={ctx?.registerBackdrop ?? undefined}
        x={0}
        y={0}
        width={800}
        height={450}
        fill="url(#dusk-sky)"
        mask="url(#dusk-edge-mask)"
        style={{ opacity: 0 }}
      />
      <ellipse
        ref={ctx?.registerGlow ?? undefined}
        cx={400}
        cy={386}
        rx={320}
        ry={60}
        fill="#c98a4b"
        filter="url(#dusk-glow)"
        mask="url(#dusk-edge-mask)"
        style={{ opacity: 0 }}
      />
    </>
  )
}

/** Foreground stays visible — dusk + palette timing handled by the shell engine. */
export function HeroForegroundFade({ children }: { children: ReactNode }) {
  return <g style={{ opacity: 1 }}>{children}</g>
}
