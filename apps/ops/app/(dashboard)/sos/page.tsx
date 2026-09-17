import { redirect } from "next/navigation"

import { SosView } from "./sos-view"
import { requireOpsPermission } from "@/lib/auth"

export default async function SosPage() {
  try {
    await requireOpsPermission("safety")
  } catch {
    redirect("/home")
  }

  return <SosView />
}
