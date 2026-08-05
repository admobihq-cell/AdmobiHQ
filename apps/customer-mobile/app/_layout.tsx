import * as Sentry from "@sentry/react-native"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import { InteractionManager } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AppErrorBoundary } from "@/components/AppErrorBoundary"
import { BrandedSplashScreen } from "@/components/BrandedSplashScreen"
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen"
import { useOtaUpdates, useSplashBootstrap } from "@/lib/bootstrap-splash"
import { useOnboarding } from "@/lib/onboarding"
import { initSentry } from "@/lib/sentry"
import { ThemeProvider, useNavigationTheme } from "@/lib/theme"
import { usePushRegistration } from "@/lib/use-push-registration"

initSentry()

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
    <>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      </Stack>
    </>
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
          <RootNavigator
            ready={ready}
            onboardingCompleted={onboardingCompleted}
            onCompleteOnboarding={completeOnboarding}
          />
        </AppErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

export default Sentry.wrap(RootLayout)
