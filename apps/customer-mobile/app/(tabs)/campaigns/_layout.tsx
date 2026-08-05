import { Stack } from "expo-router"

import { useNavigationTheme } from "@/lib/theme"

export default function CampaignsLayout() {
  const { screenOptions } = useNavigationTheme()

  return (
    <Stack screenOptions={screenOptions}>
      {/* Tab already has the persistent AppBar — hide the stack title on the list. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: "New campaign" }} />
      <Stack.Screen name="[id]" options={{ title: "Campaign" }} />
    </Stack>
  )
}
