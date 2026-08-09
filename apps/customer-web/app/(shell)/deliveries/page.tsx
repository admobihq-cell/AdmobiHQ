import { redirect } from "next/navigation"

import { DeliveriesView } from "@/components/deliveries/deliveries-view"
import { getPlatformFlags } from "@/lib/flags"

export const metadata = { title: "Deliveries" }

export default async function DeliveriesPage() {
  const flags = await getPlatformFlags()

  // Not a 404 — the URL may have been shared while the flag was on. Just
  // send customers back to the tab that's actually live right now.
  if (!flags.has("deliveries")) {
    redirect("/")
  }

  return <DeliveriesView />
}
