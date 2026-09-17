import { notFound, redirect } from "next/navigation"

import { SosDetailView } from "./sos-detail-view"
import { requireOpsPermission } from "@/lib/auth"

export default async function SosDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    await requireOpsPermission("safety")
  } catch {
    redirect("/home")
  }

  const { id } = await params
  const incidentId = Number(id)
  if (!Number.isInteger(incidentId) || incidentId <= 0) notFound()

  return <SosDetailView incidentId={incidentId} />
}
