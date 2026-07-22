import { Stack } from "expo-router"

import { useNavigationTheme } from "@/lib/theme"

export default function SettingsLayout() {
  const { screenOptions } = useNavigationTheme()

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
    </Stack>
  )
}
