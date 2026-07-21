import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo"
import { tokenCache } from "@clerk/clerk-expo/token-cache"
import { Stack, useRouter, useSegments } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { LoadingScreen } from "@/components/LoadingScreen"
import { getPrimaryEmail, isOpsStaffEmail } from "@/lib/auth"
import { useOtaUpdates, useSplashBootstrap } from "@/lib/bootstrap-splash"
import { colors } from "@/lib/theme"

import { CLERK_PUBLISHABLE_KEY } from "@/lib/env"

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on fast refresh
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const segments = useSegments()
  const router = useRouter()
  const authReady = isLoaded && userLoaded

  useSplashBootstrap(authReady)
  useOtaUpdates()

  useEffect(() => {
    if (!authReady) return

    const inAuthGroup = segments[0] === "sign-in"
    const inCustomerGroup = segments[0] === "(customer)"
    const inOpsGroup = segments[0] === "(ops)"

    if (!isSignedIn) {
      if (!inAuthGroup) {
        router.replace("/sign-in")
      }
      return
    }

    const email = getPrimaryEmail(
      user?.emailAddresses,
      user?.primaryEmailAddressId,
    )
    const isStaff = isOpsStaffEmail(email)

    if (isStaff) {
      if (inAuthGroup || inCustomerGroup || !inOpsGroup) {
        router.replace("/(ops)/dashboard")
      }
      return
    }

    if (inAuthGroup || inOpsGroup || !inCustomerGroup) {
      router.replace("/(customer)")
    }
  }, [authReady, isSignedIn, user, segments, router])

  if (!authReady) {
    return <LoadingScreen />
  }

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY ?? ""}
        tokenCache={tokenCache}
      >
        <StatusBar style="dark" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.bg,
              },
              headerTintColor: colors.primary,
              headerTitleStyle: { color: colors.text, fontWeight: "600" },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="sign-in"
              options={{ title: "Sign in", headerShown: false }}
            />
            <Stack.Screen name="(ops)" options={{ headerShown: false }} />
            <Stack.Screen name="(customer)" options={{ headerShown: false }} />
          </Stack>
        </AuthGate>
      </ClerkProvider>
    </SafeAreaProvider>
  )
}
