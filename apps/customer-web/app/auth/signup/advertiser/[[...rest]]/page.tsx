import { AdvertiserSignUp } from "@/components/auth/advertiser-sign-up"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign up" }

export default async function AdvertiserSignupPage() {
  await redirectIfAuthenticated()

  return <AdvertiserSignUp />
}
