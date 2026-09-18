import { Suspense } from "react"

import { AdvertiserSignUp } from "@/components/auth/advertiser-sign-up"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign up" }

export default async function AdvertiserSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const { redirect_url } = await searchParams
  await redirectIfAuthenticated(redirect_url)

  return (
    <Suspense fallback={null}>
      <AdvertiserSignUp />
    </Suspense>
  )
}
