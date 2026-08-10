import { AdvertiserSignIn } from "@/components/auth/advertiser-sign-in"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign in" }

export default async function AdvertiserLoginPage() {
  await redirectIfAuthenticated()

  return <AdvertiserSignIn />
}
