import { useAuth } from "@clerk/clerk-expo"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

export type GetToken = () => Promise<string | null>

// useAuth() throws without a mounted ClerkProvider, and app/_layout.tsx's
// AuthenticatedApp only mounts ClerkProvider when isAuthEnabled() is true —
// its disabled branch renders the same children (including this app's tabs)
// with no ClerkProvider ancestor at all. So nothing may call useAuth() when
// auth is disabled. isAuthEnabled() is fixed for the app's lifetime, so pick
// the implementation once at module load rather than branching inside a hook
// body. Same pattern as lib/use-live-announcements.ts and
// lib/auth/use-customer-session.ts.
function useTokenGetterEnabled(): GetToken {
  const { getToken } = useAuth()
  return getToken
}

const NO_TOKEN: GetToken = async () => null

function useTokenGetterDisabled(): GetToken {
  return NO_TOKEN
}

/** Clerk's getToken when auth is on, and a stable null-returning stand-in when
 * it is off, so authed callers are safe to mount either way. */
export const useTokenGetter = isAuthEnabled() ? useTokenGetterEnabled : useTokenGetterDisabled
