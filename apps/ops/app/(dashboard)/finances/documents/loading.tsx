import { BillingEditorSkeleton } from "@/components/dashboards/dashboard-skeletons"

/** Without this the editor routes inherit the finances overview skeleton. */
export default function BillingDocumentLoading() {
  return <BillingEditorSkeleton />
}
