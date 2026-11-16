import { Stack } from "expo-router"

import { useThemeColors } from "@/lib/theme"

export default function UsersLayout() {
  const colors = useThemeColors()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
