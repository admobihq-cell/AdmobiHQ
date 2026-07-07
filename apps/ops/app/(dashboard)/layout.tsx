import { redirect } from "next/navigation"

import { OpsShell } from "@/components/ops-shell"
import { requireOpsUser } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response && e.status === 403) {
      redirect("/")
    }
    redirect("/")
  }

  return <OpsShell>{children}</OpsShell>
}
