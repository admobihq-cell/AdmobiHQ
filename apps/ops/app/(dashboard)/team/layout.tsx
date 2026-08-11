import { redirect } from "next/navigation"

import { TeamTabs } from "@/components/team-tabs"
import { requireOpsAdmin } from "@/lib/auth"

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireOpsAdmin()
  } catch {
    redirect("/home")
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage who has access to this console, their role, and what each role can do.
        </p>
      </div>
      <TeamTabs />
      {children}
    </div>
  )
}
