import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"
import { useAuth } from "@clerk/clerk-expo"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

const DEVICE_ID_KEY = "admobi.driver.deviceId"

export type DriverSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }
  | { status: "authenticated"; userId: string; deviceId: string }

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

function useAuthenticatedSession(deviceId: string | null): DriverSession {
  const { isSignedIn, userId } = useAuth()

  if (!deviceId) return { status: "loading" }
  if (isSignedIn && userId) return { status: "authenticated", userId, deviceId }
  return { status: "anonymous", deviceId }
}

function useAnonymousSession(deviceId: string | null): DriverSession {
  if (!deviceId) return { status: "loading" }
  return { status: "anonymous", deviceId }
}

/** Same "pick the hook once at module load" pattern as customer-mobile's
 * useCustomerSession — see that file's comment for why. */
const useSessionImpl = isAuthEnabled() ? useAuthenticatedSession : useAnonymousSession

export function useDriverSession(): DriverSession {
  const deviceId = useDeviceId()
  return useSessionImpl(deviceId)
}
