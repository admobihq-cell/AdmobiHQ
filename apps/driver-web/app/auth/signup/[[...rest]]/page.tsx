import { DriverSignUp } from "@/components/auth/driver-sign-up"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign up" }

export default async function SignupPage() {
  await redirectIfAuthenticated()

  return <DriverSignUp />
}
