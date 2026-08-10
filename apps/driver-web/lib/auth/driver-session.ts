"use client"

import { useEffect, useState } from "react"

const DEVICE_ID_KEY = "admobi.driver.deviceId"

/**
 * Dormant auth seam. `@clerk/nextjs` is a dependency here (matching apps/ops),
 * but no <ClerkProvider> is mounted and this always resolves "anonymous" today
 * — flipping NEXT_PUBLIC_AUTH_ENABLED on later (plus mounting ClerkProvider in
 * app/layout.tsx and switching to Clerk SMS OTP) is what turns this into a
 * real session, linked to the existing Driver CRM record by verified phone.
 * Every screen that calls useDriverSession() keeps working unchanged.
 */
export type DriverSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }

export function useDriverSession(): DriverSession {
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

  if (!deviceId) return { status: "loading" }
  return { status: "anonymous", deviceId }
}
