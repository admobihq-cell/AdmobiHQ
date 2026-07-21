"use client"

import Link from "next/link"

import { AdmobiOtpSignInForm } from "@/components/admobi-otp-sign-in-form"
import { AuthThemeToggle } from "@/components/auth-theme-toggle"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"

export function SignInForm() {
  return (
    <>
      <AuthThemeToggle />
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Admobi Ops
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Ops Console
          </h1>
          <p className="text-sm text-muted-foreground">
            Use your @admobihq.com account
          </p>
        </div>
        <Card className="w-full max-w-md shadow-none">
          <CardContent className="pt-6">
            <AdmobiOtpSignInForm />
          </CardContent>
        </Card>
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
