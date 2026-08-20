import { useAuth } from "@clerk/clerk-expo"
import { useRouter, useSegments } from "expo-router"
import { useEffect } from "react"
import Animated, { FadeIn } from "react-native-reanimated"

import { AuthHandoff } from "@/components/AuthHandoff"
import { BrandedSplashScreen } from "@/components/BrandedSplashScreen"
import { useThemeColors } from "@/lib/theme"

const AUTH_SCREENS = ["sign-in", "sign-up"]

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const colors = useThemeColors()

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

  // Block rendering until the redirect above has actually happened — otherwise
  // there's a frame where the real (signed-out) or auth (signed-in) screen
  // renders before router.replace() takes effect. This used to reuse the
  // pure-black cold-boot splash here, which made a normal in-session handoff
  // (e.g. right after Google sign-in) look like the app had crashed back to
  // its launch screen. A themed hold screen fixes that without changing the
  // redirect logic itself.
  const isMismatched = (!isSignedIn && !inAuthScreen) || (isSignedIn && inAuthScreen)
  if (isMismatched) {
    return <AuthHandoff message={isSignedIn ? "Signing you in…" : "Signing out…"} />
  }

  return (
    <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1, backgroundColor: colors.bg }}>
      {children}
    </Animated.View>
  )
}
