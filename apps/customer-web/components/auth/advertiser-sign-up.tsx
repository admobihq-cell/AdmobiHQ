"use client"

import { SignUp } from "@clerk/nextjs"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

import { AuthDisabledMessage } from "@/components/auth/auth-disabled-message"

export function AdvertiserSignUp() {
  if (!isAuthEnabled()) {
    return <AuthDisabledMessage />
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SignUp
        path="/auth/signup/advertiser"
        routing="path"
        signInUrl="/auth/login/advertiser"
        fallbackRedirectUrl="/"
      />
    </div>
  )
}
