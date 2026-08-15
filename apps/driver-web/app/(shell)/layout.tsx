import { AppShell } from "@/components/shell/app-shell"
import { fetchDriverProfile } from "@/lib/driver-profile"
import { getPlatformFlags } from "@/lib/flags"

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const [flags, profileResult] = await Promise.all([getPlatformFlags(), fetchDriverProfile()])
  const profileStatus = profileResult.status === "ok" ? profileResult.profile.status : null

  return (
    <AppShell enabledFlags={[...flags]} profileStatus={profileStatus}>
      {children}
    </AppShell>
  )
}
