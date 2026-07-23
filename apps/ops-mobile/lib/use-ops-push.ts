import { useAuth } from "@clerk/clerk-expo"
import { useRouter } from "expo-router"
import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"

import { useOpsClient } from "@/lib/ops-client"
import {
  addPushResponseListener,
  getColdStartPushDeepLink,
  registerOpsPushToken,
  unregisterOpsPushToken,
} from "@/lib/push-notifications"

/**
 * Registers Expo push token with the API when ops staff are signed in.
 * Safe to ship via EAS Update — native expo-notifications is already in the APK.
 */
export function useOpsPushNotifications(enabled: boolean) {
  const client = useOpsClient()
  const { isSignedIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!enabled || !isSignedIn) return

    void registerOpsPushToken(client).catch((error) => {
      console.warn("[push] register failed:", error)
    })

    const onAppState = (state: AppStateStatus) => {
      if (state !== "active") return
      void registerOpsPushToken(client).catch(() => {})
    }

    const sub = AppState.addEventListener("change", onAppState)
    return () => sub.remove()
  }, [enabled, isSignedIn, client])

  useEffect(() => {
    if (!enabled) return

    void getColdStartPushDeepLink().then((link) => {
      if (link) {
        router.push(link.href as never)
      }
    })

    return addPushResponseListener((link) => {
      router.push(link.href as never)
    })
  }, [enabled, router])

  useEffect(() => {
    if (enabled && isSignedIn) return
    void unregisterOpsPushToken(client).catch(() => {})
  }, [enabled, isSignedIn, client])
}
