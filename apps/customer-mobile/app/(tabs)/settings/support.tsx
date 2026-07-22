import { Stack } from "expo-router"

import { PlaceholderScreen } from "@/components/settings/placeholder-screen"

export default function SupportSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Help & contact" }} />
      <PlaceholderScreen
        title="Help & contact"
        body="Browse FAQs, open a support ticket, or reach the Admobi team for campaign assistance."
      />
    </>
  )
}
