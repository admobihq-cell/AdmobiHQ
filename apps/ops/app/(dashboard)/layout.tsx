import { redirect } from "next/navigation"

import { OpsShell } from "@/components/ops-shell"
import { requireOpsUser } from "@/lib/auth"
import {
  getPendingCampaignsCount,
  getPendingDriverApplicationsCount,
} from "@/lib/queries/entities"

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
  const can = (permission: "driver_applications" | "campaigns") =>
    access.role === "admin" || access.permissions.includes(permission)

  // Only count what this user can actually see — a member without the
  // permission shouldn't cost a Neon query for a badge they'll never render.
  const [driverApplications, campaigns] = await Promise.all([
    can("driver_applications") ? getPendingDriverApplicationsCount() : 0,
    can("campaigns") ? getPendingCampaignsCount() : 0,
  ])

  return (
    <OpsShell
      role={access.role}
      permissions={access.permissions}
      userName={userName}
      orgName={access.orgName}
      userId={access.user.id}
      pendingCounts={{
        "/driver-applications": driverApplications,
        "/campaigns": campaigns,
      }}
    >
      {children}
    </OpsShell>
  )
}
