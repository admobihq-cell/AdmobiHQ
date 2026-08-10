import { AuthRoleEntry } from "@/components/auth/auth-role-entry"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  await redirectIfAuthenticated()

  return <AuthRoleEntry mode="login" />
}
