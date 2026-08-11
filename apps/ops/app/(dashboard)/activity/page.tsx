import { redirect } from "next/navigation"

import { ActivityView } from "./activity-view"
import { requireOpsPermission } from "@/lib/auth"

export default async function ActivityPage() {
  try {
    await requireOpsPermission("activity")
  } catch {
    redirect("/home")
  }

  return <ActivityView />
}
