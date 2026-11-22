import { redirect } from "next/navigation"

import { requireOpsPermission } from "@/lib/auth"
import { CaseDetailView } from "./case-detail-view"

export default async function SupportCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    await requireOpsPermission("support")
  } catch {
    redirect("/overview")
  }
  const { id } = await params
  return <CaseDetailView caseId={Number(id)} />
}
