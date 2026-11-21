"use client"

import * as React from "react"
import { formatCountUp, splitCountUp, type CountUpParts } from "@workspace/ops-contracts"

const DURATION_MS = 600
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function CountUpNumber({ parts, display }: { parts: CountUpParts; display: string }) {
  const [shown, setShown] = React.useState(0)
  const shownRef = React.useRef(0)

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const from = shownRef.current
    const to = parts.value
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / DURATION_MS)
      const next = from + (to - from) * easeOutCubic(t)
      shownRef.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [parts.value])

  return (
    <>
      <span className="sr-only">{display}</span>
      <span aria-hidden>{formatCountUp(parts, shown)}</span>
    </>
  )
}

/**
 * A headline figure that counts up to its value on load and eases to new values. Only a plain
 * string holding one number ("KES 18,420", "38%", "1.2K") animates; anything else renders as is.
 * Screen readers get the final value at once; reduced motion jumps straight to it.
 */
export function CountUp({ value }: { value: React.ReactNode }) {
  const parts = typeof value === "string" ? splitCountUp(value) : null
  if (!parts || typeof value !== "string") return <>{value}</>
  return <CountUpNumber parts={parts} display={value} />
}
