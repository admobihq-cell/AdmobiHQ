"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

const DEVICE_ID_KEY = "admobi.customer.deviceId"

export type CustomerSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }
  | { status: "authenticated"; userId: string; deviceId: string }

function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    try {
      let id = window.localStorage.getItem(DEVICE_ID_KEY)
      if (!id) {
        id = crypto.randomUUID()
        window.localStorage.setItem(DEVICE_ID_KEY, id)
      }
      setDeviceId(id)
    } catch {
      // Storage blocked (e.g. Safari private mode) — fall back to a
      // session-only id instead of throwing and crashing the app.
      setDeviceId(crypto.randomUUID())
    }
  }, [])

  return deviceId
}

function useAuthenticatedSession(deviceId: string | null): CustomerSession {
  const { isSignedIn, userId } = useAuth()

  if (!deviceId) return { status: "loading" }
  if (isSignedIn && userId) return { status: "authenticated", userId, deviceId }
  return { status: "anonymous", deviceId }
}

function useAnonymousSession(deviceId: string | null): CustomerSession {
  if (!deviceId) return { status: "loading" }
  return { status: "anonymous", deviceId }
}

/**
 * isAuthEnabled() is fixed for the lifetime of a deployed build (inlined from
 * NEXT_PUBLIC_* env vars at build time, never toggles at runtime), so picking
 * the hook implementation once here — rather than branching inside
 * useCustomerSession — keeps the actual hook call unconditional per render.
 * useAuth() must never run unless ClerkProvider is mounted (app/layout.tsx
 * only mounts it when this same flag is on).
 */
const useSessionImpl = isAuthEnabled() ? useAuthenticatedSession : useAnonymousSession

export function useCustomerSession(): CustomerSession {
  const deviceId = useDeviceId()
  return useSessionImpl(deviceId)
}
