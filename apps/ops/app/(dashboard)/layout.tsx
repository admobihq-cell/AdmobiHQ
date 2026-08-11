import { redirect } from "next/navigation"

import { OpsShell } from "@/components/ops-shell"
import { requireOpsUser } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let access: Awaited<ReturnType<typeof requireOpsUser>>
  try {
    access = await requireOpsUser()
  } catch {
    redirect("/")
  }

  const userName = access.user.fullName ?? access.email

  return (
    <OpsShell
      role={access.role}
      permissions={access.permissions}
      userName={userName}
      orgName={access.orgName}
    >
      {children}
    </OpsShell>
  )
}
