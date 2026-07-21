import { Stack } from "expo-router"

import { PlaceholderScreen } from "@/components/settings/placeholder-screen"

export default function AccountSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Profile & sign-in" }} />
      <PlaceholderScreen
        title="Profile & sign-in"
        body="Customer account details and authentication will be configured here. This screen is a placeholder for the OTA update test."
      />
    </>
  )
}
