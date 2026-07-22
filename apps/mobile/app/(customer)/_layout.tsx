import { Stack } from "expo-router"

import { useThemeColors } from "@/lib/theme"

export default function CustomerLayout() {
  const colors = useThemeColors()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Admobi" }} />
    </Stack>
  )
}
