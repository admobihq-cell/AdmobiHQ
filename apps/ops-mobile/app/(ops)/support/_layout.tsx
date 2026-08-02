import { Stack } from "expo-router"

import { useThemeColors } from "@/lib/theme"

export default function SupportLayout() {
  const colors = useThemeColors()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: "600" as const },
        headerShadowVisible: false,
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Support" }} />
      <Stack.Screen name="[id]" options={{ headerShown: true }} />
    </Stack>
  )
}
