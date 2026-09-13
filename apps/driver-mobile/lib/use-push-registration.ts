import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useAuth } from "@clerk/clerk-expo"

import { isNotificationsSupported } from "@/lib/notifications-core"
import { registerDriverPushToken } from "@/lib/push-registration"

/**
 * Registers this device's Expo push token with the API so ops staff can
 * broadcast announcements to it, attaching the signed-in account's Clerk
 * token so the registration is linked to the account.
 */
export function usePushRegistration() {
  const pushSupported = isNotificationsSupported()
  const { getToken } = useAuth()

  useEffect(() => {
    if (!pushSupported) return

    void registerDriverPushToken(getToken).catch((error) => {
      console.warn("[push] register failed:", error)
    })

    const onAppState = (state: AppStateStatus) => {
      if (state !== "active") return
      void registerDriverPushToken(getToken).catch(() => {})
    }

    const sub = AppState.addEventListener("change", onAppState)
    return () => sub.remove()
  }, [pushSupported, getToken])
}
