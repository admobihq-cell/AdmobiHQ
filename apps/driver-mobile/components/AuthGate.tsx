import { useAuth } from "@clerk/clerk-expo"
import { useRouter, useSegments } from "expo-router"
import { useEffect } from "react"

import { BrandedSplashScreen } from "@/components/BrandedSplashScreen"

const AUTH_SCREENS = ["sign-in", "sign-up"]

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  const inAuthScreen = AUTH_SCREENS.includes(segments[0] ?? "")

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn && !inAuthScreen) {
      router.replace("/sign-in")
      return
    }

    if (isSignedIn && inAuthScreen) {
      router.replace("/(tabs)")
    }
  }, [isLoaded, isSignedIn, inAuthScreen, router])

  if (!isLoaded) {
    return <BrandedSplashScreen />
  }

  // Block rendering until the redirect above has actually happened —
  // otherwise there's a frame where the real (signed-out) or auth (signed-in)
  // screen renders before router.replace() takes effect.
  const isMismatched = (!isSignedIn && !inAuthScreen) || (isSignedIn && inAuthScreen)
  if (isMismatched) {
    return <BrandedSplashScreen />
  }

  return <>{children}</>
}
