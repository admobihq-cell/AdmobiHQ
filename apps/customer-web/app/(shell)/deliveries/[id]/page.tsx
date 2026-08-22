import { redirect } from "next/navigation"

import { DeliveryTrackView } from "@/components/deliveries/delivery-track-view"
import { getPlatformFlags } from "@/lib/flags"

export const metadata = { title: "Track delivery" }

export default async function DeliveryTrackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const flags = await getPlatformFlags()

  // Not a 404 — the URL may have been shared while the flag was on. Just
  // send customers back to the tab that's actually live right now.
  if (!flags.has("deliveries")) {
    redirect("/")
  }

  const { id } = await params
  return <DeliveryTrackView id={id} />
}
