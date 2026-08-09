const DEFAULT_DRIVER_URL = "http://localhost:3004"
const DEFAULT_WEB_URL = "http://localhost:3000"
const DEFAULT_APP_URL = "http://localhost:3002"
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

/** Driver app public origin. */
export function driverPublicUrl(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_DRIVER_URL, DEFAULT_DRIVER_URL)
}

/** Marketing site origin. */
export function webPublicUrl(): string {
  return normalizeOrigin(
    process.env.NEXT_PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_SERVER_URL,
    DEFAULT_WEB_URL,
  )
}

/** Customer (advertiser) app origin. */
export function appPublicUrl(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_URL)
}

/** Business API public origin (api.admobihq.com). */
export function apiPublicUrl(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_API_URL, DEFAULT_API_URL)
}

/** Host label for UI, e.g. driver.admobihq.com */
export function driverHostLabel(): string {
  try {
    return new URL(driverPublicUrl()).host
  } catch {
    return "driver.admobihq.com"
  }
}
