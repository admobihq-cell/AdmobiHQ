"use client"

import { useEffect, useRef, useState } from "react"

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Eases a displayed number toward `target` on every change. Skips the animation entirely under reduced motion. */
export function useAnimatedNumber(target: number, durationMs = 450): number {
  const [displayed, setDisplayed] = useState(target)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const effectiveDuration = reduceMotion ? 0 : durationMs

    const from = displayed
    const delta = target - from
    if (delta === 0) return

    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const t = effectiveDuration === 0 ? 1 : Math.min(1, elapsed / effectiveDuration)
      setDisplayed(from + delta * easeOutCubic(t))
      if (t < 1) {
        frame.current = requestAnimationFrame(tick)
      }
    }
    frame.current = requestAnimationFrame(tick)

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return displayed
}
