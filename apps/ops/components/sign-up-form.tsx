"use client"

import Link from "next/link"

import { AdmobiOtpSignUpForm } from "@/components/admobi-otp-sign-up-form"
import { AuthThemeToggle } from "@/components/auth-theme-toggle"

export function SignUpForm() {
  return (
    <>
      <AuthThemeToggle />
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background p-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Admobi Ops
          </p>
          <h1 className="text-lg font-semibold">Create your @admobihq.com account</h1>
        </div>
        <AdmobiOtpSignUpForm />
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
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
