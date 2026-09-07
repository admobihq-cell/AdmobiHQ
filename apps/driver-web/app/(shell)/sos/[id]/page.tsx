import { notFound } from "next/navigation"

import { SosTrackingClient } from "./sos-tracking-client"

export const metadata = { title: "Your report" }

export default async function SosTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const incidentId = Number(id)
  if (!Number.isInteger(incidentId) || incidentId <= 0) notFound()

  return <SosTrackingClient incidentId={incidentId} />
}
