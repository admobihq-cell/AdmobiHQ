import { AuthRoleEntry } from "@/components/auth/auth-role-entry"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign up" }

export default async function SignupPage() {
  await redirectIfAuthenticated()

  return <AuthRoleEntry mode="signup" />
}
