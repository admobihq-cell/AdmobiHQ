import type { ReactNode } from "react"

import { TeamSettingsTabs } from "@/components/settings/team-settings-tabs"

export default function TeamSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Team</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage your organization, who has access, and what each role can do. Admins have full
        access; other members use assigned roles.
        </p>
      </div>
      <TeamSettingsTabs />
      {children}
    </div>
  )
}
