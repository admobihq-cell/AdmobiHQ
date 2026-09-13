"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"

const DEVICE_ID_KEY = "admobi.driver.deviceId"

export type DriverSession =
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

export function useDriverSession(): DriverSession {
  const deviceId = useDeviceId()
  const { isSignedIn, userId } = useAuth()

  if (!deviceId) return { status: "loading" }
  if (isSignedIn && userId) return { status: "authenticated", userId, deviceId }
  return { status: "anonymous", deviceId }
}
