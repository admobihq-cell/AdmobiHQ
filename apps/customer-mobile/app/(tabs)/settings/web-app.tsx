import { Stack } from "expo-router"
import * as WebBrowser from "expo-web-browser"

import { PlaceholderScreen } from "@/components/settings/placeholder-screen"
import { EXPO_PUBLIC_APP_URL } from "@/lib/env"

const WEB_APP_URL = EXPO_PUBLIC_APP_URL ?? "https://app.admobihq.com"

export default function WebAppSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Web app" }} />
      <PlaceholderScreen
        title="Open web app"
        body={`Campaign creation, billing, and reporting are available now at ${WEB_APP_URL}.`}
        actionLabel="Open in browser"
        onAction={() => void WebBrowser.openBrowserAsync(WEB_APP_URL)}
      />
    </>
  )
}
