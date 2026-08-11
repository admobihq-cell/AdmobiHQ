import { redirect } from "next/navigation"

import { FinanceView } from "@/components/finance-view"
import { requireOpsPermission } from "@/lib/auth"

export const metadata = { title: "Finances" }

export default async function FinancesPage() {
  try {
    await requireOpsPermission("finances")
  } catch {
    redirect("/home")
  }

  return <FinanceView />
}
