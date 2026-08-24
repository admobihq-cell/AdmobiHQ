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

type HeroTransitionContextValue = {
  registerBackdrop: (el: SVGRectElement | null) => void
  registerGlow: (el: SVGEllipseElement | null) => void
}

const HeroTransitionContext = createContext<HeroTransitionContextValue | null>(null)

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
  const backdropRef = useRef<SVGRectElement | null>(null)
  const glowRef = useRef<SVGEllipseElement | null>(null)
  const backdropOpacity = useRef(0)
  const glowOpacity = useRef(0)

  const setPaletteMix = (value: number) => {
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

    if (lastTheme.current === themeKey) return
    lastTheme.current = themeKey

    const snapped = snapDusk(isDark, backdropRef.current, glowRef.current)
    backdropOpacity.current = snapped.backdropOpacity
    glowOpacity.current = snapped.glowOpacity
    setPaletteMix(isDark ? 1 : 0)
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
