import { AuthRolePicker } from "@/components/auth/auth-role-picker"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign up" }

export default async function SignupPage() {
  await redirectIfAuthenticated()

  return <AuthRolePicker mode="signup" />
}
