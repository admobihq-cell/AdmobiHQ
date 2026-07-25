import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"

import { isNotificationsSupported } from "@/lib/notifications-core"
import { registerCustomerPushToken } from "@/lib/push-registration"

/**
 * Registers this device's Expo push token with the API so ops staff can
 * broadcast announcements to it. Anonymous — no auth on customer-mobile.
 */
export function usePushRegistration() {
  const pushSupported = isNotificationsSupported()

  useEffect(() => {
    if (!pushSupported) return

    void registerCustomerPushToken().catch((error) => {
      console.warn("[push] register failed:", error)
    })

    const onAppState = (state: AppStateStatus) => {
      if (state !== "active") return
      void registerCustomerPushToken().catch(() => {})
    }

    const sub = AppState.addEventListener("change", onAppState)
    return () => sub.remove()
  }, [pushSupported])
}
