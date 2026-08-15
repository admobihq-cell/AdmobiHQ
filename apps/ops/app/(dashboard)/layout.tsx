import { redirect } from "next/navigation"

import { OpsShell } from "@/components/ops-shell"
import { requireOpsUser } from "@/lib/auth"
import { getPendingDriverApplicationsCount } from "@/lib/queries/entities"

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
  const canSeeDriverApplications =
    access.role === "admin" || access.permissions.includes("driver_applications")
  const pendingDriverApplicationsCount = canSeeDriverApplications
    ? await getPendingDriverApplicationsCount()
    : 0

  return (
    <OpsShell
      role={access.role}
      permissions={access.permissions}
      userName={userName}
      orgName={access.orgName}
      pendingDriverApplicationsCount={pendingDriverApplicationsCount}
    >
      {children}
    </OpsShell>
  )
}
