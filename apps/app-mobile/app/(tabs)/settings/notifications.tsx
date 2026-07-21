import { Stack } from "expo-router"

import { PlaceholderScreen } from "@/components/settings/placeholder-screen"

export default function NotificationsSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Notifications" }} />
      <PlaceholderScreen
        title="Notifications"
        body="Choose which campaign events trigger push alerts, email digests, and weekly performance summaries."
      />
    </>
  )
}
