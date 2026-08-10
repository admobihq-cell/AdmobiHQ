import { CaseThreadClient } from "./case-thread-client"

export const metadata = { title: "Request detail" }

export default async function SupportCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CaseThreadClient caseId={Number(id)} />
}
