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

export const API_URL =
  trimEnv(
    process.env.EXPO_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL,
  ) ?? "http://localhost:3003"

/**
 * Marketing site origin — used to build CMS admin links (see lib/site-urls.ts).
 * Mirrors apps/ops/lib/site-urls.ts's webPublicUrl() fallback chain: web itself
 * often only has NEXT_PUBLIC_SERVER_URL set, not a dedicated WEB_URL.
 */
export const WEB_URL =
  trimEnv(
    process.env.EXPO_PUBLIC_WEB_URL ??
      process.env.NEXT_PUBLIC_WEB_URL ??
      process.env.NEXT_PUBLIC_SERVER_URL,
  ) ?? "http://localhost:3000"

/** @deprecated Use API_URL */
export const OPS_URL = API_URL
