import { Stack } from "expo-router"

import { PlaceholderScreen } from "@/components/settings/placeholder-screen"

export default function SecuritySettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Security" }} />
      <PlaceholderScreen
        title="Security"
        body="Manage passwords, two-factor authentication, and active sessions from this screen once account features ship."
      />
    </>
  )
}
