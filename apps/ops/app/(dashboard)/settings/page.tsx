import { redirect } from "next/navigation"

import { Separator } from "@workspace/ui/components/separator"
import { TourSettingsSection } from "@workspace/ui/components/tour-settings-section"

import { PlatformFlagsView } from "@/components/platform-flags-view"
import { requireOpsPermission } from "@/lib/auth"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  try {
    await requireOpsPermission("flags")
  } catch {
    redirect("/home")
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PlatformFlagsView />
      <Separator />
      <TourSettingsSection description="Replay the console orientation tour, or jump straight to a single chapter." />
    </div>
  )
}
