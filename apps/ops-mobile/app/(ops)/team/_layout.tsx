import { useEffect } from "react"
import { Stack, useRouter } from "expo-router"
import { View } from "react-native"

import { useOpsAccess } from "@/lib/ops-client"
import { useThemeColors } from "@/lib/theme"

/** Team & Roles is admin-only (mirrors requireOpsAdmin() on web's /team layout), not gated by a granular permission. */
export default function TeamLayout() {
  const colors = useThemeColors()
  const router = useRouter()
  const { role, loading } = useOpsAccess()

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.replace("/(ops)/dashboard")
    }
  }, [loading, role, router])

  if (loading || role !== "admin") {
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
      <Stack.Screen name="roles/index" options={{ headerShown: false }} />
      <Stack.Screen name="roles/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="roles/new" options={{ headerShown: false }} />
    </Stack>
  )
}
