import { notFound, redirect } from "next/navigation"

import { BillingDocumentEditor } from "@/components/billing/billing-document-editor"
import { requireOpsPermission } from "@/lib/auth"

export default async function BillingDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireOpsPermission("finances")
  } catch {
    redirect("/overview")
  }

  const { id } = await params
  const documentId = Number(id)
  if (!Number.isInteger(documentId) || documentId <= 0) notFound()

  return <BillingDocumentEditor id={documentId} />
}
