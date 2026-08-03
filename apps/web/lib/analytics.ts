type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GtagFn
  }
}

/** No-ops when GA hasn't loaded (local dev, ad blockers, consent not yet granted). */
export function trackEvent(action: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return
  window.gtag("event", action, params)
}
