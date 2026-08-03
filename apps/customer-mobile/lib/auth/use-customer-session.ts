import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"

const DEVICE_ID_KEY = "admobi.customer.deviceId"

/**
 * Dormant auth seam. `@clerk/clerk-expo` is already a dependency, but no
 * <ClerkProvider> is mounted and this always resolves "anonymous" today —
 * flipping EXPO_PUBLIC_AUTH_ENABLED on later (plus mounting ClerkProvider in
 * app/_layout.tsx) is what turns this into a real session, and every screen
 * that calls useCustomerSession() keeps working unchanged.
 */
export type CustomerSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }

/** Shared with lib/push-registration.ts so push tokens can be tied to the
 * same per-device identity used for support cases, without needing a hook. */
export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = Crypto.randomUUID()
    await AsyncStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function useCustomerSession(): CustomerSession {
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
