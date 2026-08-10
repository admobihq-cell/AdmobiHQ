"use client"

import { SignIn } from "@clerk/nextjs"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

import { AuthDisabledMessage } from "@/components/auth/auth-disabled-message"

export function AdvertiserSignIn() {
  if (!isAuthEnabled()) {
    return <AuthDisabledMessage />
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SignIn
        path="/auth/login/advertiser"
        routing="path"
        signUpUrl="/auth/signup/advertiser"
        fallbackRedirectUrl="/"
      />
    </div>
  )
}
