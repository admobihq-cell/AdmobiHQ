import { redirect } from "next/navigation"

import { PlatformFlagsView } from "@/components/platform-flags-view"
import { requireOpsPermission } from "@/lib/auth"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  try {
    await requireOpsPermission("flags")
  } catch {
    redirect("/home")
  }

  return <PlatformFlagsView />
}
