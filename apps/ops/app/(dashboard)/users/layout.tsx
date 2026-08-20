import { redirect } from "next/navigation"

import { UsersTabs } from "@/components/users-tabs"
import { requireOpsAdmin } from "@/lib/auth"

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireOpsAdmin()
  } catch {
    redirect("/home")
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Everyone with an account across the platform — drivers, customers, and ops admins.
        </p>
      </div>
      <UsersTabs />
      {children}
    </div>
  )
}
