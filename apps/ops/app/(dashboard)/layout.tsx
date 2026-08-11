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
  } catch (e) {
    if (e instanceof Response && e.status === 403) {
      redirect("/")
    }
    redirect("/")
  }

  return (
    <OpsShell role={access.role} permissions={access.permissions}>
      {children}
    </OpsShell>
  )
}
