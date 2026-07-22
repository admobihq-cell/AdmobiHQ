const DEFAULT_API_BASE_URL = "http://localhost:3003"
const PRODUCTION_API_BASE_URL = "https://api.admobihq.com"
const STAGING_API_BASE_URL = "https://api.staging.admobihq.com"

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "")
}

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return url.includes("localhost") || url.includes("127.0.0.1")
  }
}

function resolveRuntimeApiBaseUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  const hostname = window.location.hostname

  if (
    hostname === "admobihq.com" ||
    hostname === "www.admobihq.com" ||
    (hostname.endsWith(".admobihq.com") && !hostname.includes("staging"))
  ) {
    return PRODUCTION_API_BASE_URL
  }

  if (
    hostname === "staging.admobihq.com" ||
    hostname.endsWith(".staging.admobihq.com")
  ) {
    return STAGING_API_BASE_URL
  }

  return undefined
}

export function getApiBaseUrl(): string {
  const fromEnv = trimEnv(
    process.env.NEXT_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_URL,
  )
  const runtime = resolveRuntimeApiBaseUrl()

  // Never call localhost from a deployed Admobi site (missing/wrong build env).
  if (runtime && (!fromEnv || isLocalhostUrl(fromEnv))) {
    return normalizeBaseUrl(runtime)
  }

  if (fromEnv) {
    return normalizeBaseUrl(fromEnv)
  }

  if (runtime) {
    return normalizeBaseUrl(runtime)
  }

  return DEFAULT_API_BASE_URL
}

export function publicApiUrl(resource: string): string {
  const path = resource.startsWith("/") ? resource : `/${resource}`
  return `${getApiBaseUrl()}/v1/public${path}`
}
