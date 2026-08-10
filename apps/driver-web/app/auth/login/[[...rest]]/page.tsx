import { DriverSignIn } from "@/components/auth/driver-sign-in"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  await redirectIfAuthenticated()

  return <DriverSignIn />
}
