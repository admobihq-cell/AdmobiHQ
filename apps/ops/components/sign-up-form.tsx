"use client"

import Link from "next/link"

import { AdmobiOtpSignUpForm } from "@/components/admobi-otp-sign-up-form"
import { AuthThemeToggle } from "@/components/auth-theme-toggle"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"

export function SignUpForm() {
  return (
    <>
      <AuthThemeToggle />
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Admobi Ops
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground">
            @admobihq.com email required
          </p>
        </div>
        <Card className="w-full max-w-md shadow-none">
          <CardContent className="pt-6">
            <AdmobiOtpSignUpForm />
          </CardContent>
        </Card>
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
