"use client"

import { useAuth } from "@clerk/nextjs"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

type AuthToken = {
  getToken: () => Promise<string | null>
}

function useSignedInAuth(): AuthToken {
  return useAuth()
}

function useNoAuth(): AuthToken {
  return { getToken: async () => null }
}

/**
 * Same "pick the hook once at module load" pattern as driver-session.ts —
 * useAuth() must never run unless ClerkProvider is mounted (app/layout.tsx
 * only mounts it when this same flag is on). CI / auth-off builds prerender
 * without ClerkProvider; calling useAuth() there fails the Next.js build.
 */
export const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth
