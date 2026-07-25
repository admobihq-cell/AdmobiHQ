import * as Sentry from "@sentry/react-native"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import { InteractionManager } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AppErrorBoundary } from "@/components/AppErrorBoundary"
import { BrandedSplashScreen } from "@/components/BrandedSplashScreen"
import { useOtaUpdates, useSplashBootstrap } from "@/lib/bootstrap-splash"
import { initSentry } from "@/lib/sentry"
import { ThemeProvider, useNavigationTheme } from "@/lib/theme"
import { usePushRegistration } from "@/lib/use-push-registration"

initSentry()

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on fast refresh
})

function RootNavigator({ ready }: { ready: boolean }) {
  const { screenOptions, statusBarStyle } = useNavigationTheme()

  if (!ready) {
    return <BrandedSplashScreen />
  }

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}

function RootLayout() {
  const [appReady, setAppReady] = useState(false)

  useSplashBootstrap(appReady)
  useOtaUpdates()
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
          <RootNavigator ready={appReady} />
        </AppErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

export default Sentry.wrap(RootLayout)
