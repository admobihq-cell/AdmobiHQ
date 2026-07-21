import { Stack } from "expo-router"

import { PlaceholderScreen } from "@/components/settings/placeholder-screen"
import { EXPO_PUBLIC_APP_URL } from "@/lib/env"

export default function WebAppSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Web app" }} />
      <PlaceholderScreen
        title="Open web app"
        body={`Deep links to ${EXPO_PUBLIC_APP_URL ?? "the customer web app"} will open here. For now this confirms navigation works after an OTA update.`}
      />
    </>
  )
}
