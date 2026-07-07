import { redirect } from "next/navigation"

import { OpsAccessDenied } from "@/components/ops-access-denied"
import { SignUpForm } from "@/components/sign-up-form"
import { getOpsAccess } from "@/lib/auth"

export default async function SignUpPage() {
  const access = await getOpsAccess()

  if (access.status === "authorized") {
    redirect("/home")
  }

  if (access.status === "forbidden") {
    return <OpsAccessDenied email={access.email} />
  }

  return <SignUpForm />
}
