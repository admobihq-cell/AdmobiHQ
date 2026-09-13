import { Suspense } from "react"

import { AdvertiserSignIn } from "@/components/auth/advertiser-sign-in"
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated"

export const metadata = { title: "Sign in" }

export default async function AdvertiserLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const { redirect_url } = await searchParams
  await redirectIfAuthenticated(redirect_url)

  return (
    <Suspense fallback={null}>
      <AdvertiserSignIn />
    </Suspense>
  )
}
