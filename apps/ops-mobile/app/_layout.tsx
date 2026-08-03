import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo"
import { tokenCache } from "@clerk/clerk-expo/token-cache"
import * as Sentry from "@sentry/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Stack, useRouter, useSegments } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useRef, useState } from "react"
import { StyleSheet, Text, useColorScheme, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AppErrorBoundary } from "@/components/AppErrorBoundary"
import { LoadingScreen } from "@/components/LoadingScreen"
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen"
import { getPrimaryEmail, isOpsStaffEmail } from "@/lib/auth"
import { useOtaUpdates, useSplashBootstrap } from "@/lib/bootstrap-splash"
import { useOnboarding } from "@/lib/onboarding"
import { ThemeProvider, useNavigationTheme } from "@/lib/theme"
import { darkColors, lightColors } from "@/lib/theme/palettes"

import { useOpsPushNotifications } from "@/lib/use-ops-push"
import { configurePushNotificationHandler } from "@/lib/push-notifications"
import { initSentry } from "@/lib/sentry"
import { CLERK_PUBLISHABLE_KEY } from "@/lib/env"

initSentry()
configurePushNotificationHandler()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on fast refresh
})

function MissingConfigScreen({ message }: { message: string }) {
  const scheme = useColorScheme()
  const colors = scheme === "dark" ? darkColors : lightColors

  useEffect(() => {
    void SplashScreen.hideAsync()
  }, [])

  return (
    <View style={[configStyles.container, { backgroundColor: colors.bg }]}>
      <Text style={[configStyles.title, { color: colors.text }]}>
        Configuration required
      </Text>
      <Text style={[configStyles.body, { color: colors.mutedForeground }]}>
        {message}
      </Text>
    </View>
  )
}

const configStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const { colors } = useNavigationTheme()
  const segments = useSegments()
  const router = useRouter()
  const authReady = isLoaded && userLoaded
  const [handoffVisible, setHandoffVisible] = useState(false)
  const handoffStarted = useRef(false)
  const {
    checked: onboardingChecked,
    completed: onboardingCompleted,
    complete: completeOnboarding,
  } = useOnboarding()

  useSplashBootstrap(authReady)
  useOtaUpdates(authReady)

  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId,
  )
  const isStaff = isOpsStaffEmail(email)

  useOpsPushNotifications(Boolean(isSignedIn && isStaff))

  const inAuthGroup = segments[0] === "sign-in" || segments[0] === "sign-up"
  const inCustomerGroup = segments[0] === "(customer)"
  const inOpsGroup = segments[0] === "(ops)"
  const inOnboardingReplay = segments[0] === "onboarding-replay"

  const needsOpsRedirect = Boolean(
    isSignedIn &&
      isStaff &&
      (inAuthGroup || inCustomerGroup || (!inOpsGroup && !inOnboardingReplay)),
  )
  const needsCustomerRedirect =
    Boolean(isSignedIn && !isStaff && (inAuthGroup || inOpsGroup || !inCustomerGroup))
  const isRedirecting = needsOpsRedirect || needsCustomerRedirect

  useEffect(() => {
    if (!authReady) return

    if (!isSignedIn) {
      handoffStarted.current = false
      setHandoffVisible(false)
      if (!inAuthGroup) {
        router.replace("/sign-in")
      }
      return
    }

    if (isStaff) {
      // First-time staff onboarding takes over rendering below; hold off on
      // the dashboard redirect until it's been checked and cleared.
      if (!onboardingChecked || !onboardingCompleted) return

      if (inAuthGroup || inCustomerGroup || (!inOpsGroup && !inOnboardingReplay)) {
        if (!handoffStarted.current) {
          handoffStarted.current = true
          setHandoffVisible(true)
        }
        router.replace("/(ops)/dashboard")
      }
      return
    }

    if (inAuthGroup || inOpsGroup || !inCustomerGroup) {
      router.replace("/(customer)")
    }
  }, [
    authReady,
    isSignedIn,
    isStaff,
    inAuthGroup,
    inCustomerGroup,
    inOpsGroup,
    inOnboardingReplay,
    onboardingChecked,
    onboardingCompleted,
    router,
  ])

  useEffect(() => {
    if (!handoffVisible) return
    if (inOpsGroup && !inAuthGroup) {
      const timer = setTimeout(() => setHandoffVisible(false), 280)
      return () => clearTimeout(timer)
    }
  }, [handoffVisible, inOpsGroup, inAuthGroup])

  if (!authReady) {
    return <LoadingScreen />
  }

  if (isSignedIn && isStaff && !onboardingChecked) {
    return <LoadingScreen />
  }

  // First staff sign-in on this device: a one-time orientation to the tool
  // before landing on the dashboard.
  if (isSignedIn && isStaff && !onboardingCompleted) {
    return <OnboardingScreen onDone={completeOnboarding} />
  }

  // Returning staff session: skip auth UI, brief cream handoff into dashboard.
  if (isSignedIn && isStaff && (isRedirecting || handoffVisible)) {
    return (
      <LoadingScreen splash={false} message="Opening Ops…" />
    )
  }

  if (!isSignedIn) {
    return (
      <Animated.View
        entering={FadeIn.duration(380)}
        style={[styles.authShell, { backgroundColor: colors.bg }]}
      >
        {children}
      </Animated.View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  authShell: {
    flex: 1,
  },
})

function RootNavigator() {
  const { screenOptions, statusBarStyle } = useNavigationTheme()

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <AuthGate>
        <Stack screenOptions={{ ...screenOptions, animation: "fade" }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="sign-in"
            options={{ title: "Sign in", headerShown: false }}
          />
          <Stack.Screen
            name="sign-up"
            options={{ title: "Create account", headerShown: false }}
          />
          <Stack.Screen name="(ops)" options={{ headerShown: false }} />
          <Stack.Screen name="(customer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding-replay"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
        </Stack>
      </AuthGate>
    </>
  )
}

function RootLayout() {
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
      <ThemeProvider>
        <AppErrorBoundary>
          <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
            <QueryClientProvider client={queryClient}>
              <RootNavigator />
            </QueryClientProvider>
          </ClerkProvider>
        </AppErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

export default Sentry.wrap(RootLayout)
