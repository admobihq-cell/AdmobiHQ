import type { ReactNode } from "react"

import { SettingsNav } from "@/components/settings/settings-nav"

export default function SettingsPrefsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage your profile, sign-in, and notification preferences.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
