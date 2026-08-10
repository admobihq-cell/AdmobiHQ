import { AuthRolePicker } from "@/components/auth/auth-role-picker"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  await redirectIfAuthenticated()

  return <AuthRolePicker mode="login" />
}
