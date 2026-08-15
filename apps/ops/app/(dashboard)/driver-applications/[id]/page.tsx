import { DriverApplicationDetailView } from "./driver-application-detail-view"

export default async function DriverApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DriverApplicationDetailView applicationId={Number(id)} />
}
