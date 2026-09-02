import { redirect } from "next/navigation"

import { requireOpsAdmin } from "@/lib/auth"
import { listIntegrations } from "@/lib/queries/integrations"

import { IntegrationsView } from "./integrations-view"

export const metadata = { title: "Integrations" }

export default async function IntegrationsPage() {
  try {
    await requireOpsAdmin()
  } catch {
    redirect("/home")
  }

  const integrations = await listIntegrations()
  return <IntegrationsView integrations={integrations} />
}
