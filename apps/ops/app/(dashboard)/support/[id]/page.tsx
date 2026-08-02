import { CaseDetailView } from "./case-detail-view"

export default async function SupportCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CaseDetailView caseId={Number(id)} />
}
