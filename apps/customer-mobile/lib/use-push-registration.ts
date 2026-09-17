import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useAuth } from "@clerk/clerk-expo"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import {
  addPushReceivedListener,
  addPushResponseListener,
  getColdStartPushDeepLink,
  isNotificationsSupported,
} from "@/lib/notifications-core"
import { registerCustomerPushToken } from "@/lib/push-registration"
import { CAMPAIGN_NOTIFICATIONS_KEY } from "@/lib/use-customer-inbox"

// useAuth() throws when called without a ClerkProvider ancestor, and
// app/_layout.tsx only mounts ClerkProvider when isAuthEnabled() is true — its
// disabled branch renders PushRegistrationBridge with no provider at all. So
// this must never call useAuth() when auth is off. isAuthEnabled() is fixed for
// the app's lifetime, so pick the hook implementation once at module load
// instead of branching inside a single hook body.
type Session = { getToken: (() => Promise<string | null>) | undefined; userId: string | null }

function useSessionEnabled(): Session {
  const { getToken, userId } = useAuth()
  return { getToken, userId: userId ?? null }
}

function useSessionDisabled(): Session {
  return { getToken: undefined, userId: null }
}

const useSession = isAuthEnabled() ? useSessionEnabled : useSessionDisabled

/**
 * Registers this device's Expo push token with the API so ops staff can
 * broadcast announcements to it and campaign decisions can reach this one
 * account, and routes a tapped notification to the screen it names.
 */
export function usePushRegistration() {
  const pushSupported = isNotificationsSupported()
  const { getToken, userId } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!pushSupported) return

    void registerCustomerPushToken(getToken).catch((error) => {
      console.warn("[push] register failed:", error)
    })

    const onAppState = (state: AppStateStatus) => {
      if (state !== "active") return
      void registerCustomerPushToken(getToken).catch(() => {})
    }

    const sub = AppState.addEventListener("change", onAppState)
    return () => sub.remove()
    // userId is in here on purpose: Clerk's getToken keeps a stable identity
    // across sign-in, so without it a token registered before sign-in would
    // keep its null clerk_user_id until the app next went to the background —
    // and notifyUserPush only finds tokens by clerk_user_id.
  }, [pushSupported, getToken, userId])

  useEffect(() => {
    if (!pushSupported) return

    void getColdStartPushDeepLink().then((link) => {
      if (link) router.push(link.href as never)
    })

    return addPushResponseListener((link) => {
      router.push(link.href as never)
    })
  }, [pushSupported, router])

  useEffect(() => {
    if (!pushSupported) return

    return addPushReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: CAMPAIGN_NOTIFICATIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: ["live-announcements"] })
    })
  }, [pushSupported, queryClient])
}
