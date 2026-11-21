import { redirect } from "next/navigation"

import { BillingDocumentEditor } from "@/components/billing/billing-document-editor"
import { requireOpsPermission } from "@/lib/auth"

export default async function NewBillingDocumentPage() {
  try {
    await requireOpsPermission("finances")
  } catch {
    redirect("/home")
  }

  return <BillingDocumentEditor id={null} />
}
