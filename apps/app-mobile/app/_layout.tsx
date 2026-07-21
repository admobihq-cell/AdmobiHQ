import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import { InteractionManager } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { BrandedSplashScreen } from "@/components/BrandedSplashScreen"
import { useOtaUpdates, useSplashBootstrap } from "@/lib/bootstrap-splash"
import { colors } from "@/lib/theme"

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on fast refresh
})

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false)

  useSplashBootstrap(appReady)
  useOtaUpdates()

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setAppReady(true)
    })

    return () => task.cancel()
  }, [])

  if (!appReady) {
    return <BrandedSplashScreen />
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: "600" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  )
}
