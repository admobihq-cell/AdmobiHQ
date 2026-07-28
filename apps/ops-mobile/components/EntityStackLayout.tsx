import { Pressable } from "react-native"
import { Stack, useRouter } from "expo-router"

import { ChevronLeft } from "@/components/icons"
import { useThemeColors } from "@/lib/theme"

function StackBackButton() {
  const router = useRouter()
  const colors = useThemeColors()

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back()
          return
        }
        router.replace("/(ops)/dashboard")
      }}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [{ marginLeft: -4, opacity: pressed ? 0.6 : 1 }]}
    >
      <ChevronLeft color={colors.primary} size={28} />
    </Pressable>
  )
}

export function EntityStackLayout() {
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
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: "Add",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: "Edit",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Details",
          headerLargeTitle: false,
          headerBackVisible: false,
          headerLeft: () => <StackBackButton />,
        }}
      />
    </Stack>
  )
}
