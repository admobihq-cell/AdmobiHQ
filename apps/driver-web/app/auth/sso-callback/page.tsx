import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

import { AuthDisabledMessage } from "@/components/auth/auth-disabled-message"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

export const metadata = { title: "Signing you in…" }

export default function SsoCallbackPage() {
  // CI / auth-off prerenders without ClerkProvider (see app/layout.tsx).
  if (!isAuthEnabled()) {
    return <AuthDisabledMessage />
  }

  return (
    <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" />
  )
}
