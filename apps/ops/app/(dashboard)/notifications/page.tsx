import { redirect } from "next/navigation"

import { requireOpsUser } from "@/lib/auth"
import { NotificationsView } from "./notifications-view"

export const metadata = { title: "Notifications" }

export default async function NotificationsPage() {
  let access: Awaited<ReturnType<typeof requireOpsUser>>
  try {
    access = await requireOpsUser()
  } catch {
    redirect("/")
  }

  return (
    <NotificationsView role={access.role} permissions={access.permissions} />
  )
}
