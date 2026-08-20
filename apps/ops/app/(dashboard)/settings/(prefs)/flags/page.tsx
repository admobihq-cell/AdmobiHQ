import { redirect } from "next/navigation"

import { PlatformFlagsView } from "@/components/platform-flags-view"
import { requireOpsPermission } from "@/lib/auth"

export const metadata = { title: "Platform flags" }

export default async function PlatformFlagsPage() {
  try {
    await requireOpsPermission("flags")
  } catch {
    redirect("/home")
  }

  return <PlatformFlagsView />
}
