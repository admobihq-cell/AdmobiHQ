import { redirect } from "next/navigation"

import { OpsAccessDenied } from "@/components/ops-access-denied"
import { SignInForm } from "@/components/sign-in-form"
import { getOpsAccess } from "@/lib/auth"

export const metadata = { title: "Sign in" }

export default async function SignInPage() {
  const access = await getOpsAccess()

  if (access.status === "authorized") {
    redirect("/home")
  }

  if (access.status === "forbidden") {
    return <OpsAccessDenied email={access.email} />
  }

  return <SignInForm />
}
