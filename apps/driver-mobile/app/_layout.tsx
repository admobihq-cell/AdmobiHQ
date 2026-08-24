import { ClerkProvider } from "@clerk/clerk-expo"
import { tokenCache } from "@clerk/clerk-expo/token-cache"
import * as Sentry from "@sentry/react-native"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import * as WebBrowser from "expo-web-browser"
import { useEffect, useState } from "react"
import { InteractionManager } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AppErrorBoundary } from "@/components/AppErrorBoundary"
import { AuthGate } from "@/components/AuthGate"
import { BrandedSplashScreen } from "@/components/BrandedSplashScreen"
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen"
import { ProfileSetupGate } from "@/components/ProfileSetupGate"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { useOtaUpdates, useSplashBootstrap } from "@/lib/bootstrap-splash"
import { CLERK_PUBLISHABLE_KEY } from "@/lib/env"
import { useOnboarding } from "@/lib/onboarding"
import { QUERY_CACHE_BUSTER, queryClient, queryPersister } from "@/lib/query-client"
import { initSentry } from "@/lib/sentry"
import { ThemeProvider, useNavigationTheme } from "@/lib/theme"
import { usePushRegistration } from "@/lib/use-push-registration"

initSentry()
// Required once at app root so the browser tab opened for Google OAuth
// (via useSSO) closes and hands control back to the app after redirect.
WebBrowser.maybeCompleteAuthSession()

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  if (!isAuthEnabled()) {
    return <>{children}</>
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <AuthGate>
        <ProfileSetupGate>{children}</ProfileSetupGate>
      </AuthGate>
    </ClerkProvider>
  )
}

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on fast refresh
})

function RootNavigator({
  ready,
  onboardingCompleted,
  onCompleteOnboarding,
}: {
  ready: boolean
  onboardingCompleted: boolean
  onCompleteOnboarding: () => void
}) {
  const { screenOptions, statusBarStyle } = useNavigationTheme()

  if (!ready) {
    return <BrandedSplashScreen />
  }

  if (!onboardingCompleted) {
    return <OnboardingScreen onDone={onCompleteOnboarding} />
  }

  return (
    <AuthenticatedApp>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false, animation: "fade" }} />
      </Stack>
    </AuthenticatedApp>
  )
}

function RootLayout() {
  const [appReady, setAppReady] = useState(false)
  const {
    checked: onboardingChecked,
    completed: onboardingCompleted,
    complete: completeOnboarding,
  } = useOnboarding()
  const ready = appReady && onboardingChecked

  useSplashBootstrap(ready)
  useOtaUpdates(ready)
  usePushRegistration()

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setAppReady(true)
    })

    return () => task.cancel()
  }, [])

  // ThemeProvider must wrap every screen — including during splash — so hooks
  // like useThemeColors never run outside context (Expo Router / Fast Refresh).
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppErrorBoundary>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: queryPersister,
              maxAge: 24 * 60 * 60 * 1000,
              buster: QUERY_CACHE_BUSTER,
            }}
          >
            <RootNavigator
              ready={ready}
              onboardingCompleted={onboardingCompleted}
              onCompleteOnboarding={completeOnboarding}
            />
          </PersistQueryClientProvider>
        </AppErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

export default Sentry.wrap(RootLayout)
