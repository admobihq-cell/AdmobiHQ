import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"
import { useAuth } from "@clerk/clerk-expo"

const DEVICE_ID_KEY = "admobi.customer.deviceId"

export type CustomerSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }
  | { status: "authenticated"; userId: string; deviceId: string }

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

function useDeviceId(): string | null {
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

  return deviceId
}

export function useCustomerSession(): CustomerSession {
  const deviceId = useDeviceId()
  const { isSignedIn, userId } = useAuth()

  if (!deviceId) return { status: "loading" }
  if (isSignedIn && userId) return { status: "authenticated", userId, deviceId }
  return { status: "anonymous", deviceId }
}
