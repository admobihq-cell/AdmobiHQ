import { DashboardView } from "@/components/overview/dashboard-view"
import { getPlatformFlags } from "@/lib/flags"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const flags = await getPlatformFlags()

  return <DashboardView deliveriesEnabled={flags.has("deliveries")} />
}
