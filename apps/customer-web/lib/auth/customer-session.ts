"use client"

import { useEffect, useState } from "react"

const DEVICE_ID_KEY = "admobi.customer.deviceId"

/**
 * Dormant auth seam. `@clerk/nextjs` is a dependency here (matching apps/ops),
 * but no <ClerkProvider> is mounted and this always resolves "anonymous" today
 * — flipping NEXT_PUBLIC_AUTH_ENABLED on later (plus mounting ClerkProvider in
 * app/layout.tsx) is what turns this into a real session, and every screen
 * that calls useCustomerSession() keeps working unchanged.
 */
export type CustomerSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }

export function useCustomerSession(): CustomerSession {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    let id = window.localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(DEVICE_ID_KEY, id)
    }
    setDeviceId(id)
  }, [])

  if (!deviceId) return { status: "loading" }
  return { status: "anonymous", deviceId }
}
