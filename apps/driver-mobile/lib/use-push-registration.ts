import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useAuth } from "@clerk/clerk-expo"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { isNotificationsSupported } from "@/lib/notifications-core"
import { registerDriverPushToken } from "@/lib/push-registration"

// usePushRegistration() is mounted in RootLayout, which renders *outside*
// ClerkProvider (ClerkProvider is only mounted conditionally inside
// AuthenticatedApp, further down the tree, when isAuthEnabled() is true).
// useAuth() throws when called without a ClerkProvider ancestor, so we can't
// call it unconditionally here. isAuthEnabled() is fixed for the app's
// lifetime, so pick the hook implementation once at module load instead of
// branching inside a single hook body.
function useTokenGetterEnabled(): (() => Promise<string | null>) | undefined {
  const { getToken } = useAuth()
  return getToken
}

function useTokenGetterDisabled(): undefined {
  return undefined
}

const useTokenGetter = isAuthEnabled() ? useTokenGetterEnabled : useTokenGetterDisabled

/**
 * Registers this device's Expo push token with the API so ops staff can
 * broadcast announcements to it, attaching the signed-in account's Clerk
 * token (when auth is enabled) so the registration is linked to the account.
 */
export function usePushRegistration() {
  const pushSupported = isNotificationsSupported()
  const getToken = useTokenGetter()

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
