import { redirect } from "next/navigation"

import { requireOpsPermission } from "@/lib/auth"
import { DriverApplicationDetailView } from "./driver-application-detail-view"

export default async function DriverApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    await requireOpsPermission("driver_applications")
  } catch {
    redirect("/overview")
  }
  const { id } = await params
  return <DriverApplicationDetailView applicationId={Number(id)} />
}
