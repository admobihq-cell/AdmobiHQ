import { useSyncExternalStore } from "react"

// One shared animation-frame clock for the demo fleet. Subscribers pick a
// step: markers want every frame, panels only need whole seconds — and
// because the snapshot is quantized, React skips re-rendering a 1s
// subscriber on the frames in between.
let now = Date.now() / 1000
let frame = 0
const listeners = new Set<() => void>()

function tick() {
  now = Date.now() / 1000
  listeners.forEach((l) => l())
  frame = requestAnimationFrame(tick)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) frame = requestAnimationFrame(tick)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) cancelAnimationFrame(frame)
  }
}

/** Wall-clock seconds, rounded down to `step` (0 = every frame). */
export function useSimNow(step = 0): number {
  return useSyncExternalStore(
    subscribe,
    () => (step > 0 ? Math.floor(now / step) * step : now),
    () => 0,
  )
}
