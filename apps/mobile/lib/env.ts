/**
 * Expo inlines EXPO_PUBLIC_* at bundle time. Infisical uses NEXT_PUBLIC_* for web/ops/api.
 * env:pull maps those into .env.local; fallbacks help if only NEXT_PUBLIC_* is present.
 */
function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export const CLERK_PUBLISHABLE_KEY = readEnv(
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
)

export const API_URL =
  readEnv("EXPO_PUBLIC_API_URL", "NEXT_PUBLIC_API_URL") ??
  "http://localhost:3003"

/** @deprecated Use API_URL */
export const OPS_URL = API_URL
