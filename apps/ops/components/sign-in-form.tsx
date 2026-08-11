"use client"

import Link from "next/link"

import { AdmobiOtpSignInForm } from "@/components/admobi-otp-sign-in-form"
import { AuthThemeToggle } from "@/components/auth-theme-toggle"
import { AuthSplitShell } from "@workspace/ui/components/auth-split-shell"

export function SignInForm() {
  return (
    <>
      <AuthThemeToggle />
      <AuthSplitShell
        photoSrc="/auth/hero-ops.jpg"
        photoAlt="Aerial view of Nairobi's central business district"
        statement="Every screen, driver, and campaign — one console."
        statementDetail="Internal tools for the Admobi team to run leads, fleet, drivers, and campaigns across Nairobi."
        formClassName="max-w-lg"
      >
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Admobi Ops
            </p>
            <h1 className="font-heading text-xl font-medium">Sign in to Ops Console</h1>
            <p className="text-sm text-muted-foreground">Use your @admobihq.com account</p>
          </div>
          <AdmobiOtpSignInForm />
          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      </AuthSplitShell>
    </>
  )
}
