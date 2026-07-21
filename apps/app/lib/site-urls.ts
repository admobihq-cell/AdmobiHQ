const DEFAULT_APP_URL = "http://localhost:3002"
const DEFAULT_WEB_URL = "http://localhost:3000"
const DEFAULT_OPS_URL = "http://localhost:3001"
const DEFAULT_API_URL = "http://localhost:3003"

function normalizeOrigin(raw: string | undefined, fallback: string): string {
  const value = raw?.trim()
  if (!value) {
    return fallback
  }
  try {
    return new URL(value.replace(/\/$/, "")).origin
  } catch {
    return fallback
  }
}

/** Customer app public origin. */
export function appPublicUrl(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_URL)
}

/** Marketing site origin. */
export function webPublicUrl(): string {
  return normalizeOrigin(
    process.env.NEXT_PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_SERVER_URL,
    DEFAULT_WEB_URL,
  )
}

/** Ops console public origin. */
export function opsPublicUrl(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_OPS_URL, DEFAULT_OPS_URL)
}

/** Business API public origin (api.admobihq.com). */
export function apiPublicUrl(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_API_URL, DEFAULT_API_URL)
}

/** Host label for UI, e.g. app.admobihq.com */
export function appHostLabel(): string {
  try {
    return new URL(appPublicUrl()).host
  } catch {
    return "app.admobihq.com"
  }
}
