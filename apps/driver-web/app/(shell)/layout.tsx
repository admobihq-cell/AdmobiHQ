import { AppShell } from "@/components/shell/app-shell"
import { getPlatformFlags } from "@/lib/flags"

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const flags = await getPlatformFlags()

  return <AppShell enabledFlags={[...flags]}>{children}</AppShell>
}
