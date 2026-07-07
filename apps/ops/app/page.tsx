import { redirect } from "next/navigation"

import { OpsAccessDenied } from "@/components/ops-access-denied"
import { OpsGateway } from "@/components/ops-gateway"
import { getOpsAccess } from "@/lib/auth"

export default async function EntrancePage() {
  const access = await getOpsAccess()

  if (access.status === "authorized") {
    redirect("/home")
  }

  if (access.status === "forbidden") {
    return <OpsAccessDenied email={access.email} />
  }

  return <OpsGateway />
}
