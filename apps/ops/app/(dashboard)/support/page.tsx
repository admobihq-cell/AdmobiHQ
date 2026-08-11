import { redirect } from "next/navigation"

import { SupportView } from "./support-view"
import { requireOpsPermission } from "@/lib/auth"

export default async function SupportPage() {
  try {
    await requireOpsPermission("support")
  } catch {
    redirect("/home")
  }

  return <SupportView />
}
