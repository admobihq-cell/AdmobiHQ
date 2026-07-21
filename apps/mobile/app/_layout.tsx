import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo"
import { tokenCache } from "@clerk/clerk-expo/token-cache"
import { Stack, useRouter, useSegments } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { StyleSheet, Text, View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { LoadingScreen } from "@/components/LoadingScreen"
import { getPrimaryEmail, isOpsStaffEmail } from "@/lib/auth"
import { useOtaUpdates, useSplashBootstrap } from "@/lib/bootstrap-splash"
import { colors } from "@/lib/theme"

import { CLERK_PUBLISHABLE_KEY } from "@/lib/env"

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on fast refresh
})

function MissingConfigScreen({ message }: { message: string }) {
  useEffect(() => {
    void SplashScreen.hideAsync()
  }, [])

  return (
    <View style={configStyles.container}>
      <Text style={configStyles.title}>Configuration required</Text>
      <Text style={configStyles.body}>{message}</Text>
    </View>
  )
}

const configStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.mutedForeground,
  },
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
  const clerkKey = CLERK_PUBLISHABLE_KEY?.trim()

  if (!clerkKey?.startsWith("pk_")) {
    return (
      <SafeAreaProvider>
        <MissingConfigScreen message="EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY was not set when this APK was built. In the Expo dashboard, open the admobihq-ops project → Environment variables → preview, add the Clerk publishable key, then run eas build again." />
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
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
