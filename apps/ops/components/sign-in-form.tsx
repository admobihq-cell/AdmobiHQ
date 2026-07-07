"use client"

import Link from "next/link"

import { AdmobiOtpSignInForm } from "@/components/admobi-otp-sign-in-form"
import { AuthThemeToggle } from "@/components/auth-theme-toggle"

export function SignInForm() {
  return (
    <>
      <AuthThemeToggle />
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background p-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Admobi Ops
          </p>
          <h1 className="text-lg font-semibold">Sign in with your @admobihq.com account</h1>
        </div>
        <AdmobiOtpSignInForm />
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Back to entrance
          </Link>
        </p>
      </div>
    </>
  )
}
