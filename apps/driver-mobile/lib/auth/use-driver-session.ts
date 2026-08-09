import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"

const DEVICE_ID_KEY = "admobi.driver.deviceId"

/**
 * Dormant auth seam. `@clerk/clerk-expo` is already a dependency, but no
 * <ClerkProvider> is mounted and this always resolves "anonymous" today —
 * flipping EXPO_PUBLIC_AUTH_ENABLED on later (plus mounting ClerkProvider in
 * app/_layout.tsx and switching to Clerk SMS OTP) is what turns this into a
 * real session, linked to the existing Driver CRM record by verified phone.
 * Every screen that calls useDriverSession() keeps working unchanged.
 */
export type DriverSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = Crypto.randomUUID()
    await AsyncStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function useDriverSession(): DriverSession {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const id = await getOrCreateDeviceId()
      if (!cancelled) setDeviceId(id)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!deviceId) return { status: "loading" }
  return { status: "anonymous", deviceId }
}
