import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

export const metadata = { title: "Signing you in…" }

export default function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" />
}
