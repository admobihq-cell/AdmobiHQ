import { Stack } from "expo-router"

import { colors } from "@/lib/theme"

export const entityStackOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitle: "Back",
  contentStyle: { backgroundColor: colors.bg },
}

export function EntityStackLayout() {
  return (
    <Stack screenOptions={entityStackOptions}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Details",
          headerLargeTitle: false,
        }}
      />
    </Stack>
  )
}
