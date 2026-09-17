import { Stack } from "expo-router"

import { useNavigationTheme } from "@/lib/theme"

export default function SosLayout() {
  const { screenOptions } = useNavigationTheme()

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: "Get help" }} />
      <Stack.Screen name="[id]" options={{ title: "Your report" }} />
    </Stack>
  )
}
