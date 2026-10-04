import { redirect } from "next/navigation"

import { OpsAccessDenied } from "@/components/auth/ops-access-denied"
import { SignInForm } from "@/components/auth/sign-in-form"
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
