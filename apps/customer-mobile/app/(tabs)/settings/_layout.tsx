import { Stack } from "expo-router"

import { useNavigationTheme } from "@/lib/theme"

export default function SettingsLayout() {
  const { screenOptions } = useNavigationTheme()

  return (
    <Stack screenOptions={screenOptions}>
      {/* Tab already has the persistent AppBar — hide the stack title on the list. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ title: "Profile & sign-in" }} />
      <Stack.Screen name="security" options={{ title: "Security" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="billing" options={{ title: "Wallet & billing" }} />
      <Stack.Screen name="support" options={{ title: "Help & contact" }} />
      <Stack.Screen name="support/new" options={{ title: "New request" }} />
      <Stack.Screen name="support/[id]" options={{ title: "Support case" }} />
      <Stack.Screen name="web-app" options={{ title: "Open web app" }} />
    </Stack>
  )
}
