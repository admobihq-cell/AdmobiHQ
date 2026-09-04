/**
 * Expo inlines EXPO_PUBLIC_* at bundle time via static `process.env.EXPO_PUBLIC_*`
 * access only. Dynamic `process.env[key]` is NOT replaced and stays undefined in
 * EAS/release bundles — always read with literal property names.
 *
 * Infisical / local .env.local may also expose NEXT_PUBLIC_* (mapped by env:pull).
 */
function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export const CLERK_PUBLISHABLE_KEY = trimEnv(
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
)

/**
 * localhost / private-LAN hosts only reach a dev machine on the same network.
 * In a release build (preview or production APK) they're dead ends, so a baked-in
 * LAN IP — env:pull rewrites localhost → the builder's LAN IP — is treated the
 * same as unset and falls back to production. Kept as-is in __DEV__ so physical
 * devices can still hit the local API.
 */
function isUnreachableInRelease(url: string): boolean {
  if (__DEV__) return false
  try {
    const { hostname } = new URL(url)
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    )
  } catch {
    return false
  }
}

/**
 * Business API origin. Unset env vars (e.g. an EAS build/profile missing
 * EXPO_PUBLIC_API_URL) and unreachable localhost/LAN URLs fall back to production.
 */
const configuredApiUrl = trimEnv(
  process.env.EXPO_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL,
)
export const API_URL =
  configuredApiUrl && !isUnreachableInRelease(configuredApiUrl)
    ? configuredApiUrl
    : "https://api.admobihq.com"

/**
 * Marketing site origin — used to build CMS admin links (see lib/site-urls.ts),
 * opened via Linking.openURL in the device's browser.
 */
export const WEB_URL =
  trimEnv(
    process.env.EXPO_PUBLIC_WEB_URL ??
      process.env.NEXT_PUBLIC_WEB_URL ??
      process.env.NEXT_PUBLIC_SERVER_URL,
  ) ?? "https://admobihq.com"

/** @deprecated Use API_URL */
export const OPS_URL = API_URL
