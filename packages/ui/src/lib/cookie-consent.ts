/**
 * Per-visitor cookie-consent state, shared by the CookieConsentBanner
 * component and @workspace/sentry-config's client init (and any app that
 * needs to gate its own non-essential scripts, e.g. apps/web's Google
 * Analytics). Distinct from the ops-controlled PlatformFlag mechanism —
 * this is a per-browser choice, not a global on/off switch.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "admobi.cookieConsent"

const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000 // re-prompt after ~180 days

export type CookieConsentChoice = "all" | "essential"

type CookieConsentRecord = {
  choice: CookieConsentChoice
  decidedAt: string
}

function isChoice(value: unknown): value is CookieConsentChoice {
  return value === "all" || value === "essential"
}

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>
    if (!isChoice(parsed.choice)) return null

    const decidedAt = new Date(parsed.decidedAt ?? "").getTime()
    if (!Number.isFinite(decidedAt) || Date.now() - decidedAt > MAX_AGE_MS) return null

    return { choice: parsed.choice, decidedAt: parsed.decidedAt! }
  } catch {
    return null
  }
}

export function writeCookieConsent(choice: CookieConsentChoice): void {
  if (typeof window === "undefined") return
  try {
    const record: CookieConsentRecord = { choice, decidedAt: new Date().toISOString() }
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Storage blocked (e.g. Safari private mode) — banner just reappears next visit.
  }
}

/** True only once the visitor has explicitly accepted everything. No stored
 * choice (or "essential") both resolve to false — never assume consent. */
export function hasFullConsent(): boolean {
  return readCookieConsent()?.choice === "all"
}
