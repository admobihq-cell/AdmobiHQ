"use client"

import Link from "next/link"
import { SignOutButton } from "@clerk/nextjs"
import { ShieldAlert } from "lucide-react"

import { AuthThemeToggle } from "@/components/auth-theme-toggle"
import { Button } from "@workspace/ui/components/button"

type OpsAccessDeniedProps = {
  email: string | null
}

export function OpsAccessDenied({ email }: OpsAccessDeniedProps) {
  return (
    <>
      <AuthThemeToggle />
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-background p-6">
        <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5">
            <ShieldAlert className="size-7 text-destructive" />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Access denied
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              This account is not authorized
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The Ops console is limited to{" "}
              <span className="font-medium text-foreground">@admobihq.com</span>{" "}
              accounts. Sign out and try again with your company email.
            </p>
            {email ? (
              <p className="rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                Signed in as{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <SignOutButton redirectUrl="/sign-in">
              <Button className="sm:min-w-52">Sign out and try again</Button>
            </SignOutButton>
            <Button variant="outline" asChild className="sm:min-w-44">
              <Link href="/">Back to entrance</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
