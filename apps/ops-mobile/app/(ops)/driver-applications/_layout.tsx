import { useEffect } from "react"
import { Stack, useRouter } from "expo-router"
import { View } from "react-native"

import { useOpsAccess } from "@/lib/ops-client"
import { useThemeColors } from "@/lib/theme"

export default function DriverApplicationsLayout() {
  const colors = useThemeColors()
  const router = useRouter()
  const { role, permissions, loading } = useOpsAccess()
  const allowed = role === "admin" || permissions.includes("driver_applications")

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace("/(ops)/dashboard")
    }
  }, [loading, allowed, router])

  if (loading || !allowed) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  )
}
