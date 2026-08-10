import { CLERK_PUBLISHABLE_KEY } from "@/lib/env"

/**
 * Real auth (Clerk) only turns on when both the flag and the driver
 * instance's publishable key are present — a stray flag with no key must
 * never crash the app into a half-mounted ClerkProvider.
 */
export function isAuthEnabled(): boolean {
  return process.env.EXPO_PUBLIC_AUTH_ENABLED === "true" && Boolean(CLERK_PUBLISHABLE_KEY)
}
