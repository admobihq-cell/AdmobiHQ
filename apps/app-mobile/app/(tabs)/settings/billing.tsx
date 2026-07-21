import { Stack } from "expo-router"

import { PlaceholderScreen } from "@/components/settings/placeholder-screen"

export default function BillingSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Billing" }} />
      <PlaceholderScreen
        title="Billing"
        body="View invoices, update payment methods, and download receipts for your Admobi campaigns."
      />
    </>
  )
}
